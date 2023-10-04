import React from "react";
import type {RadioChangeEvent} from "antd"
import type {ColumnsType} from 'antd/es/table'
import {Radio, Divider, Space, Input, Button, Table, InputNumber} from "antd";
import minimalVarianceOptimizer, {Options as MinimalVarianceOptionsValue} from '../lib/minimalVariance'
import MinimalVarianceOptions from "./MinimalVarianceOptions";

import fetchAsset from "../lib/fetchAsset";
import AssetInfo from "../lib/AssetInfo";
import backTesting, {TestingResult} from "../lib/backTesting";
import TestingResultView from "./TestingResultView";

import './AssetAllocation.css'

type Prop = {}

type AssetItem = {
  symbol: string,
  weight: number
}

type State = {
  method: string,
  inputAsset: string,
  options: MinimalVarianceOptionsValue,
  assets: AssetItem[],
  benchmark: string,
  running: boolean,
  result: TestingResult | null
}

class AssetAllocation extends React.Component<Prop, State> {

  state: State = {
    method: 'minimal_variance',
    options: {
      minWeight: 0.05,
      maxWeight: 0.80,
      turnoverConstraint: 0.10,
      back: 60
    },
    inputAsset: '',
    assets: [
      {symbol: 'CSIH11001', weight: 0.80},
      {symbol: 'SH518880', weight: 0.10},
      {symbol: 'SH510880', weight: 0.10}
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

  onInputAssetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const symbol: string = e.target.value
    this.setState(() => ({inputAsset: symbol}))
  }

  onAddAsset = () => {
    const symbol = this.state.inputAsset.trim()
    if (symbol !== '') {
      this.setState((state) => {
        const assets = [...state.assets, {symbol, weight: 0}];
        return {inputAsset: '', assets};
      })
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

  runBackTesting = async () => {

    this.setState(() => ({running: true}))

    const {assets, benchmark, method, options} = this.state

    const assetsInfo = await Promise.all(
      assets.map(it => fetchAsset(it.symbol))
    )
    const benchmarkInfo = await fetchAsset(benchmark)

    let actualMethod: (assets: AssetInfo[], day: string) => number[]
    if (method === 'manual_specified') {
      const weights = assets.map(a => a.weight)
      actualMethod = () => weights
    } else {
      actualMethod = minimalVarianceOptimizer(options)
    }

    const result = backTesting(assetsInfo, benchmarkInfo, actualMethod, options)

    this.setState(() => ({
      result,
      assets: result.assets.map((a, i) => ({
        symbol: a.symbol,
        weight: result.last[i]
      })),
      running: false
    }))
  }

  render() {

    const {
      method, options, inputAsset, assets,
      result, running
    } = this.state;

    let maybeOptions;
    if (method === 'minimal_variance') {
      maybeOptions = (
        <MinimalVarianceOptions value={options} onOptionsChange={this.onMinimalVarianceOptionsChange}/>
      )
    } else {
      maybeOptions = <></>
    }

    const assetColumns: ColumnsType<AssetItem> = [
      {
        title: '代码',
        dataIndex: 'symbol',
        key: 'symbol'
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
        <Radio value={'manual_specified'}>手动指定</Radio>
      </Radio.Group>

      {maybeOptions}

      <Divider orientation="left" plain>
        选择资产
      </Divider>

      <Space.Compact style={{width: '200px'}}>
        <Input placeholder="输入资产的代码" value={inputAsset} onChange={this.onInputAssetChange}/>
        <Button type="primary" onClick={this.onAddAsset}>添加</Button>
      </Space.Compact>

      <Table dataSource={assets} columns={assetColumns}
             rowKey="symbol" pagination={false} size="small"/>

      <Divider orientation="left" plain>
        模拟
      </Divider>

      <Button type="primary" style={{float: "right"}}
              onClick={this.runBackTesting} loading={running}>模拟</Button>

      <TestingResultView result={result}/>
    </div>)
  }
}

export default AssetAllocation
