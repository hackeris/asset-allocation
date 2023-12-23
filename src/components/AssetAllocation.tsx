import React from "react";
import {RadioChangeEvent, Select} from "antd"
import type {ColumnsType} from 'antd/es/table'
import {Radio, Divider, Space, Button, Table, InputNumber} from "antd";
import minimalVarianceOptimizer, {Options as MinimalVarianceOptionsValue} from '../lib/minimalVariance'
import MinimalVarianceOptions from "./MinimalVarianceOptions";

import fetchAsset from "../lib/fetchAsset";
import AssetInfo from "../lib/AssetInfo";
import backTesting, {TestingResult, Period} from "../lib/backTesting";
import TestingResultView from "./TestingResultView";

import './AssetAllocation.css'
import AutoComplete from "antd/es/auto-complete";
import searchAsset from "../lib/searchAsset";

type Prop = {}

type AssetItem = {
  symbol: string,
  weight: number,
  name: string
}

type State = {
  method: string,
  assetSearch: string,
  assetLoading: boolean,
  period: Period,
  searchCandidates: { value: string; label: string }[],
  options: MinimalVarianceOptionsValue,
  assets: AssetItem[],
  benchmark: string,
  running: boolean,
  result: TestingResult | null
}

const periodOptions = [
  {value: 'quarterly', label: '季度'},
  {value: 'semi_annually', label: '半年度'},
  {value: 'annually', label: '年度'}
]

class AssetAllocation extends React.Component<Prop, State> {

  state: State = {
    method: 'minimal_variance',
    options: {
      minWeight: 0.05,
      maxWeight: 0.80,
      turnoverConstraint: 0.10,
      back: 60
    },
    period: 'quarterly',
    assetSearch: '',
    assetLoading: false,
    searchCandidates: [],
    assets: [
      {symbol: 'CSIH11001', weight: 0.80, name: '中证全债'},
      {symbol: 'SH518880', weight: 0.10, name: '黄金ETF'},
      {symbol: 'SH510880', weight: 0.10, name: '红利ETF'}
    ],
    benchmark: 'SH511880',
    running: false,
    result: null
  }

  onModelChange = (e: RadioChangeEvent) => {
    const method = e.target.value as string
    this.setState(() => ({method}))
  }

  onMinimalVarianceOptionsChange = (options: MinimalVarianceOptionsValue) => {
    this.setState(() => ({options}))
  }

  onInputAssetSearch = async (search: string) => {
    this.setState(() => ({assetSearch: search}))
    if (search !== '') {
      const candidates = await searchAsset(search);
      this.setState(() => ({
        searchCandidates: candidates.map(a =>
          ({value: a.symbol, label: `${a.name}（${a.symbol}）`}))
      }))
    } else {
      this.setState(() => ({
        searchCandidates: []
      }))
    }
  }

  onAddAsset = async (symbol: string) => {

    this.setState(() => ({assetSearch: ''}))

    if (symbol !== '' && this.state.assets.findIndex(a => a.symbol === symbol) < 0) {

      this.setState(() =>
        ({assetLoading: true, searchCandidates: []}))
      try {
        const info = await fetchAsset(symbol)
        this.setState((state) => {
          const assets = [...state.assets, {symbol, weight: 0, name: info.name}];
          return {assets, assetLoading: false};
        })
      } catch (e) {
        alert('获取' + symbol + '失败')
        this.setState(() => ({assetLoading: false}))
      }
    }
  }

  onAssetWeightChange = (symbol: string, value: number) => {
    const assets = [...this.state.assets]
    const target = assets.findIndex(it => it.symbol === symbol)
    if (target >= 0) {
      assets[target] = {...assets[target], weight: value / 100.0};
    }
    this.setState(() => ({assets}))
  }

  onRemoveAsset = (symbol: string) => {
    const assets = [...this.state.assets]
    const target = assets.findIndex(it => it.symbol === symbol)
    if (target >= 0) {
      assets.splice(target, 1)
      this.setState(() => ({assets}))
    }
  }

  onBenchmarkChange = async (benchmark: string) => {
    this.setState(() => ({benchmark}))
    await this.runBackTesting(benchmark)
  }

  onPeriodSelected = (e: RadioChangeEvent) => {
    const period = e.target.value
    this.setState(() => ({period: period as Period}))
  }

  runBackTesting = async (benchmark: string) => {

    this.setState(() => ({running: true}))

    const {assets, method, period, options} = this.state

    try {
      const assetsInfo = await Promise.all(
        assets.map(it => fetchAsset(it.symbol))
      )
      const benchmarkInfo = await fetchAsset(benchmark)

      let actualMethod: (assets: AssetInfo[], day: string) => number[]
      if (method === 'manual_specified') {
        actualMethod = () => assets.map(a => a.weight)
      } else {
        actualMethod = minimalVarianceOptimizer(options)
      }

      const result = backTesting(assetsInfo, benchmarkInfo, actualMethod, period, options)

      this.setState(() => ({
        result,
        assets: result.assets.map((a, i) => ({
          symbol: a.symbol,
          weight: result.latest[i],
          name: a.name
        })),
        running: false
      }))
    } catch (e) {
      this.setState(() => ({
        result: null,
        running: false
      }))
      alert('获取资产数据失败')
    }
  }

  render() {

    const {
      method, options, benchmark,
      period,
      assetSearch, assetLoading, searchCandidates,
      assets,
      result, running
    } = this.state;

    let methodOptions;
    if (method === 'minimal_variance') {
      methodOptions = (
        <MinimalVarianceOptions value={options} onOptionsChange={this.onMinimalVarianceOptionsChange}/>
      )
    } else {
      methodOptions = <></>
    }

    const assetColumns: ColumnsType<AssetItem> = [
      {
        title: '代码',
        dataIndex: 'symbol',
        key: 'symbol',
        render: (value) => {
          return value
        }
      },
      {
        title: '名称',
        dataIndex: 'name',
        key: 'name',
        render: (value, item) => {
          return <a href={'https://xueqiu.com/S/' + item.symbol} target="_blank">{value}</a>
        }
      },
      {
        title: '权重',
        dataIndex: 'weight',
        key: 'weight',
        render: (value, item) => {
          const percent: number = parseFloat((value * 100.0).toFixed(2))
          return (
            <InputNumber suffix="%" value={percent} min={0} max={100}
                         disabled={method === 'minimal_variance'} size="middle"
                         onChange={(v) => this.onAssetWeightChange(item.symbol, v as number)}/>
          );
        }
      },
      {
        title: '操作',
        key: 'action',
        render: (_, item) => (
          <Button type="link" danger
                  onClick={() => this.onRemoveAsset(item.symbol)}>移除</Button>
        )
      }
    ]

    return (<div className="asset-allocation">
      <Divider orientation="left" plain>
        选择策略
      </Divider>
      <Radio.Group
        onChange={this.onModelChange}
        value={this.state.method}>
        <Radio value={'minimal_variance'}>风险最小化</Radio>
        <Radio value={'manual_specified'}>固定比例</Radio>
      </Radio.Group>

      {methodOptions}

      <Divider orientation="left" plain>
        策略周期
      </Divider>

      <Radio.Group
        options={periodOptions}
        onChange={this.onPeriodSelected}
        value={period}
        optionType="button"
        buttonStyle="solid"
      />

      <Divider orientation="left" plain>
        选择资产
      </Divider>

      <Space.Compact>
        <AutoComplete
          style={{width: 300}}
          value={assetSearch}
          disabled={assetLoading}
          options={searchCandidates}
          onSelect={this.onAddAsset}
          onSearch={this.onInputAssetSearch}
          placeholder="在此搜索并添加资产"
        />
      </Space.Compact>

      <Table dataSource={assets} columns={assetColumns}
             rowKey="symbol" pagination={false} size="small"/>

      <Divider orientation="left" plain>
        模拟
      </Divider>

      <Button type="primary" style={{float: "right"}}
              onClick={() => this.runBackTesting(benchmark)} loading={running}>模拟</Button>

      <TestingResultView result={result} onBenchmarkChange={this.onBenchmarkChange}/>
    </div>)
  }
}

export default AssetAllocation
