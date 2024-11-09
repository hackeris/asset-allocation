import React from "react"
import {RadioChangeEvent, Select} from "antd"
import type {ColumnsType} from 'antd/es/table'
import {Radio, Divider, Space, Button, Table, InputNumber, Popover} from "antd"
import AutoComplete from "antd/es/auto-complete"
import './AssetAllocation.css'

import minimalVarianceOptimizer from '../lib/minimalVariance'
import {Options as OptimizerOptionsValue} from '../lib/modelCommon'
import OptimizerOptions from "./OptimizerOptions"

import fetchAsset from "../lib/fetchAsset"
import AssetInfo from "../lib/AssetInfo"
import backTesting, {TestingResult, Period} from "../lib/backTesting"
import TestingResultView from "./TestingResultView"

import searchAsset from "../lib/searchAsset"
import gradientDescentOptimizer from "../lib/gradientDescent"
import riskParityObjective, {maximizeSharp, riskParityAndMinimalVariance} from "../lib/riskParity"

type Prop = {}

type AssetItem = {
  symbol: string,
  weight: number,
  name: string,
  returnModel: string
}

type State = {
  method: string,
  assetSearch: string,
  assetLoading: boolean,
  period: Period,
  searchCandidates: { value: string; label: string }[],
  options: OptimizerOptionsValue,
  assets: AssetItem[],
  benchmark: string,
  running: boolean,
  result: TestingResult | null
}

const periodOptions = [
  {value: 'quarterly', label: '季度', hover: '每隔一个季度使用模型对组合进行调整'},
  {value: 'semi_annually', label: '半年度', hover: '每隔半年使用模型对组合进行调整'},
  {value: 'annually', label: '年度', hover: '每隔一年使用模型对组合进行调整'}
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
    period: 'semi_annually',
    assetSearch: '',
    assetLoading: false,
    searchCandidates: [],
    assets: [
      {symbol: 'F161119', weight: 0.80, name: '中债综合', returnModel: '5y.cnbond'},
      {symbol: 'SH518880', weight: 0.10, name: '黄金ETF', returnModel: '0.history'},
      {symbol: 'SH510880', weight: 0.10, name: '红利ETF', returnModel: 'SH000015.pe'}
    ],
    benchmark: 'SH511880',
    running: false,
    result: null
  }

  onModelChange = (e: RadioChangeEvent) => {
    const method = e.target.value as string
    this.setState(() => ({method}))
  }

  onOptimizerOptionsChange = (options: OptimizerOptionsValue) => {
    this.setState(() => ({options}))
  }

  onInputAssetSearch = async (search: string) => {
    this.setState(() => ({assetSearch: search}))
    if (search !== '') {
      const candidates = await searchAsset(search)
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
          const assets = [...state.assets, {
            symbol,
            weight: 0,
            name: info.name,
            returnModel: symbol + '.history'
          }]
          return {assets, assetLoading: false}
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
      assets[target] = {...assets[target], weight: value / 100.0}
    }
    this.setState(() => ({assets}))
  }

  onReturnModelChange = (symbol: string, value: string) => {
    const assets = [...this.state.assets]
    const target = assets.findIndex(it => it.symbol === symbol)
    if (target >= 0) {
      assets[target] = {...assets[target], returnModel: value}
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
        assets.map(it => fetchAsset(it.symbol, it.returnModel))
      )
      const benchmarkInfo = await fetchAsset(benchmark)

      let actualMethod: (assets: AssetInfo[], day: string) => number[]
      if (method === 'minimal_variance') {
        actualMethod = minimalVarianceOptimizer(options)
      } else if (method === 'risk_parity') {
        actualMethod = gradientDescentOptimizer(riskParityObjective, options, {})
      } else if (method === 'complex_model') {
        const optimizer = riskParityAndMinimalVariance(0.05)
        actualMethod = gradientDescentOptimizer(optimizer, options, {minIterate: 200, learningRate: 0.01})
      } else if (method === 'maximize_sharp') {
        actualMethod = gradientDescentOptimizer(maximizeSharp, options, {
          minIterate: 200,
          learningRate: 0.03,
          tolerance: 0.00005
        })
      } else {
        actualMethod = () => assets.map(a => a.weight)
      }

      const result = backTesting(assetsInfo, benchmarkInfo, actualMethod, period, options)

      this.setState(() => ({
        result,
        assets: result.assets.map((a, i) => ({
          symbol: a.symbol,
          weight: result.latest[i],
          name: assets[i].name,
          returnModel: assets[i].returnModel
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
    } = this.state

    let methodOptions
    if (method !== 'manual_specified') {
      methodOptions = (
        <OptimizerOptions value={options} onOptionsChange={this.onOptimizerOptionsChange}/>
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
        key: 'symbol',
        render: (value, item) => {
          return <a href={'https://xueqiu.com/S/' + item.symbol} target="_blank">{value}</a>
        }
      },
      {
        title: '权重',
        dataIndex: 'weight',
        key: 'symbol',
        render: (value, item) => {
          const percent: number = parseFloat((value * 100.0).toFixed(2))
          return (
            <InputNumber suffix="%" value={percent} min={0} max={100}
                         disabled={method !== 'manual_specified'} size="middle"
                         onChange={(v) => this.onAssetWeightChange(item.symbol, v as number)}/>
          )
        }
      },
      {
        title: '收益模型',
        dataIndex: 'returnModel',
        key: 'symbol',
        render: (value, item) => {
          return (
            <Select value={item.returnModel}
                    onChange={(v) => this.onReturnModelChange(item.symbol, v as string)}>
              <Select.Option value={item.symbol + '.history'}>历史收益</Select.Option>
              <Select.Option value="SH000016.pe">上证50 PE</Select.Option>
              <Select.Option value="SH000300.pe">沪深300 PE</Select.Option>
              <Select.Option value="SP500.pe">标普500 PE</Select.Option>
              <Select.Option value="SH000922.pe">中证红利 PE</Select.Option>
              <Select.Option value="SH000015.pe">上证红利 PE</Select.Option>
              <Select.Option value="5y.cnbond">5年国债</Select.Option>
              <Select.Option value="0.history">零收益</Select.Option>
            </Select>
          )
        }
      },
      {
        title: '操作',
        key: 'symbol',
        render: (_, item) => (
          <Button type="link" danger
                  onClick={() => this.onRemoveAsset(item.symbol)}>移除</Button>
        )
      }
    ]

    const models = [{
      name: '风险最小化',
      value: 'minimal_variance',
      hover: '基于资产的历史数据，以最小化波动为目标对投资组合进行优化'
    }, {
      name: '风险平价',
      value: 'risk_parity',
      hover: '基于资产的历史数据，以均衡各资产的风险贡献为目标对投资组合进行优化'
    }, {
      name: '混合模型',
      value: 'complex_model',
      hover: '“风险最小化”和“风险平价”的组合'
    }, {
      name: '最大化夏普比',
      value: 'maximize_sharp',
      hover: '最大化风险收益比'
    }, {
      name: '手动指定',
      value: 'manual_specified',
      hover: '手动指定资产的配比'
    }]

    return (<div className="asset-allocation">
      <Divider orientation="left" plain>
        选择模型
      </Divider>
      <Radio.Group
        optionType="button"
        buttonStyle="solid"
        onChange={this.onModelChange}
        value={this.state.method}>
        {models.map(item => (
          <Popover content={item.hover} key={item.value}>
            <Radio value={item.value}>{item.name}</Radio>
          </Popover>
        ))}
      </Radio.Group>

      {methodOptions}

      <Divider orientation="left" plain>
        交易频率
      </Divider>

      <Radio.Group
        onChange={this.onPeriodSelected}
        value={period}
        optionType="button"
        buttonStyle="solid">
        {periodOptions.map(item => (
          <Popover content={item.hover} key={item.value}>
            <Radio value={item.value}>{item.label}</Radio>
          </Popover>
        ))}
      </Radio.Group>

      <Divider orientation="left" plain>
        选择资产
      </Divider>

      <Space.Compact>
        <AutoComplete
          style={{width: 400}}
          value={assetSearch}
          disabled={assetLoading}
          options={searchCandidates}
          onSelect={this.onAddAsset}
          onSearch={this.onInputAssetSearch}
          placeholder="在此搜索基金并添加，例如 510050、300ETF、纯债"
        />
      </Space.Compact>

      <Table dataSource={assets} columns={assetColumns}
             rowKey="symbol" pagination={false} size="small"/>

      <Divider orientation="left" plain>
        模拟
      </Divider>

      <Popover content='根据上述配置，基于资产历史数据进行模拟交易'>
        <Button type="primary" style={{float: "right"}}
                onClick={() => this.runBackTesting(benchmark)}
                loading={running}>
          模拟
        </Button>
      </Popover>

      <TestingResultView result={result} onBenchmarkChange={this.onBenchmarkChange}/>
    </div>)
  }
}

export default AssetAllocation
