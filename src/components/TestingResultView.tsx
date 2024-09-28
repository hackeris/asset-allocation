import React from "react";
import {TestingResult} from "../lib/backTesting";
import Plot from 'react-plotly.js'

import './TestingResultView.css'
import {Select, Table, Tabs} from "antd";
import * as Plotly from "plotly.js";
import {groupBy, last, zip} from "lodash";
import {cumulative} from "../lib/statistics";

type Prop = {
  result: TestingResult | null,
  onBenchmarkChange: (symbol: string) => any
}

const latestAllocationColumns = [
  {
    title: '代码',
    dataIndex: 'symbol',
    key: 'symbol'
  },
  {
    title: '名称',
    dataIndex: 'name',
    key: 'name',
    render: (value: string, item: any) => {
      return <a href={'https://xueqiu.com/S/' + item.symbol} target="_blank">{value}</a>
    }
  },
  {
    title: '比例',
    dataIndex: 'weight',
    key: 'weight',
    render: (value: number) => `${(value * 100).toFixed(2)}%`
  }
]

const historyReturnColumns = [
  {
    title: '时间',
    dataIndex: 'interval',
    key: 'interval',
  },
  {
    title: '组合',
    dataIndex: 'profolio',
    key: 'profolio',
    render: (value: number) => (
      <span style={{color: value > 0 ? '#d20' : '#093'}}>
        {value > 0 ? '+' : ''}{(value * 100).toFixed(2)}%
      </span>
    )
  },
  {
    title: '基准',
    dataIndex: 'benchmark',
    key: 'benchmark',
    render: (value: number) => (
      <span style={{color: value > 0 ? '#d20' : '#093'}}>
        {value > 0 ? '+' : ''}{(value * 100).toFixed(2)}%
      </span>
    )
  },
  {
    title: '超额收益',
    dataIndex: 'active',
    key: 'active',
    render: (value: number) => (
      <span style={{color: value > 0 ? '#d20' : '#093'}}>
        {value > 0 ? '+' : ''}{(value * 100).toFixed(2)}%
      </span>
    )
  }
]

const benchmarkCandidates = [
  {value: 'SH511880', label: '活期存款'},
  {value: 'SH000012', label: '国债指数'},
  {value: 'CSIH11009', label: '中债综合'},
  {value: 'SH000011', label: '基金指数'},
  {value: 'SH510050', label: '上证50'},
  {value: 'SH510300', label: '沪深300'},
  {value: 'SH513500', label: '标普500'},
  {value: 'SH518880', label: '黄金'},
  {value: 'CSIH11001', label: '中证全债'},
  {value: 'CSIH11015', label: '中证短债'},
];

function historyIntervalReturns(result: TestingResult) {

  const days = zip(result.profolio.days, result.profolio.dailyReturns, result.benchmark.dailyReturns)

  const intervals = groupBy(days, triple => triple[0]?.slice(0, 4))

  return Object.keys(intervals).map(key => {
    const triples = intervals[key]
    const profolio = last(cumulative(triples.map(t => t[1]) as number[])) as number;
    const benchmark = last(cumulative(triples.map(t => t[2]) as number[])) as number;
    return {
      interval: key,
      profolio,
      benchmark,
      active: profolio - benchmark
    }
  }).sort((a, b) => -a.interval.localeCompare(b.interval))
}

class TestingResultView extends React.Component<Prop, any> {

  onBenchmarkSelected = (symbol: string) => {
    this.props.onBenchmarkChange(symbol)
  }

  onHoldingClicked = (e: Readonly<Plotly.LegendClickEvent>): boolean => {
    const i = e.curveNumber
    const asset = this.props.result?.assets[i]
    const symbol = asset?.symbol
    window.open(`https://xueqiu.com/S/${symbol}`)
    return false
  }

  render() {

    const {result} = this.props

    if (!result) {
      return <></>
    }

    const {
      days, benchmarkName,
      profolio, benchmark,
      assets, holdings,
      risk, latest
    } = result

    const curveData = [
      {
        x: days,
        y: profolio.accumulativeReturns,
        mode: 'lines',
        name: '组合',
        opacity: 0.9,
        line: {width: 3},
        hovertemplate: '%{x}<br>%{y:.2%}'
      },
      {
        x: days,
        y: benchmark.accumulativeReturns,
        mode: 'lines',
        name: benchmarkName,
        opacity: 0.6,
        line: {dash: 'dashdot', width: 2},
        hovertemplate: '%{x}<br>%{y:.2%}'
      }
    ]
    const curveLayout = {
      title: {},
      yaxis: {tickformat: '.0%', tickfont: {size: 10}},
      xaxis: {tickformat: '%Y-%m', hoverformat: '%Y-%m-%d'},
      margin: {t: 10, b: 40, l: 40, r: 20},
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)',
      legend: {
        x: 0,
        xanchor: "left" as ("auto" | "left" | "center" | "right"),
        y: 1
      }
    }

    const latestAllocation = latest.map((w, i) => ({
      symbol: assets[i].symbol,
      name: assets[i].name,
      weight: w
    }))
    const latestAllocationTable = (
      <Table dataSource={latestAllocation} columns={latestAllocationColumns} rowKey={'symbol'}/>
    );

    const holdingData = assets.map((a, i) => ({
      x: days,
      y: holdings.map(h => h[i]),
      stackgroup: 'one',
      name: a.name,
      hovertemplate: '%{x}<br>%{y:.2%}'
    }))
    const holdingLayout = {
      yaxis: {tickformat: '.0%', tickfont: {size: 10}},
      xaxis: {tickformat: '%Y-%m', hoverformat: '%Y-%m-%d'},
      margin: {t: 10, b: 40, l: 40, r: 20},
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    }
    const holdingHistory = (
      <Plot className="holding" data={holdingData} layout={holdingLayout} style={{marginTop: '5px'}}
            onLegendClick={this.onHoldingClicked} config={{responsive: true}}/>
    );

    const intervalReturns = historyIntervalReturns(result)
    const historyPerformance = (
      <Table dataSource={intervalReturns} columns={historyReturnColumns}
             pagination={{pageSize: 5}} rowKey={'interval'}/>
    );

    const riskItems =
      risk.risks.map((v, i) => ({name: assets[i].name, risk: v}))
    const totalRisk = risk.totalRisk
    const riskAnalysis = (
      <ul className={'risk-detail'}>
        <li className={'risk-item'}>
          <div className={'content'}>
            <p>总风险</p>
            <p>{(totalRisk * 100).toFixed(2)}%</p>
          </div>
          <div className={'indicator'} style={{width: '100%', height: '4px', background: '#d20'}}></div>
        </li>
        {riskItems.map(it => (
          <li className={'risk-item'} key={it.name}>
            <div className={'content'}>
              <p>{it.name}</p>
              <p>{(it.risk * 100).toFixed(2)}%</p>
            </div>
            <div className={'indicator'} style={{
              width: (it.risk / totalRisk * 100) + '%',
              height: '2px',
              background: it.risk > 0 ? '#d20' : '#093'
            }}></div>
          </li>
        ))}
      </ul>
    );

    return (
      <div>
        <div className="summary">
          <span>
            年化：{(profolio.annualized * 100.0).toFixed(2)}%
            ({(benchmark.annualized * 100.0).toFixed(2)}%)
          </span>
          <span>
            夏普比：{profolio.sharpe.toFixed(2)}
            ({benchmark.sharpe.toFixed(2)})
          </span>
          <span>
            波动率：{(profolio.volatility * 100.0).toFixed(2)}%
            ({(benchmark.volatility * 100.0).toFixed(2)}%)
          </span>
          <span>
            比较基准：
            <Select
              defaultValue="SH511880"
              style={{width: 120}}
              onChange={this.onBenchmarkSelected}
              options={benchmarkCandidates}
              size={'small'}
            />
          </span>
        </div>
        <Plot className="curve" data={curveData} layout={curveLayout} style={{marginTop: '15px'}}
              config={{responsive: true}}/>
        <Tabs defaultActiveKey="1" items={[
          {
            key: 'history-performance',
            label: '历史收益',
            children: historyPerformance
          },
          {
            key: 'latest-allocation',
            label: '最新配置',
            children: latestAllocationTable
          },
          {
            key: 'risk-analysis',
            label: '风险分解',
            children: riskAnalysis
          },
          {
            key: 'holding-history',
            label: '历史持仓',
            children: holdingHistory
          }
        ]}/>
      </div>
    );
  }

}

export default TestingResultView
