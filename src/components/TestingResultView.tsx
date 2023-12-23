import React from "react";
import {TestingResult} from "../lib/backTesting";
import Plot from 'react-plotly.js'

import './TestingResultView.css'
import {Select} from "antd";
import * as Plotly from "plotly.js";

type Prop = {
  result: TestingResult | null,
  onBenchmarkChange: (symbol: string) => any
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
      annualized, volatility, sharpe,
      days, series, benchmark, benchmarkName,
      assets, holdings
    } = result

    const curveData = [{
      x: days,
      y: series,
      mode: 'lines',
      name: '组合',
      opacity: 0.9,
      line: {
        width: 3
      }
    }, {
      x: days,
      y: benchmark,
      mode: 'lines',
      name: benchmarkName,
      opacity: 0.7,
      line: {
        dash: 'dashdot',
        width: 2
      }
    }]
    const curveLayout = {
      title: {
        text: '模拟收益',
        font: {size: 15}
      },
      yaxis: {tickformat: '.2%', tickfont: {size: 10}},
      xaxis: {tickformat: '%Y-%m', hoverformat: '%Y-%m-%d'},
      margin: {t: 30, b: 40, l: 50, r: 20},
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    }

    const holdingData = assets.map((a, i) => ({
      x: days,
      y: holdings.map(h => h[i]),
      stackgroup: 'one',
      name: a.name
    }))
    const holdingLayout = {
      title: {
        text: '历史持仓',
        font: {size: 15}
      },
      yaxis: {tickformat: '.2%', tickfont: {size: 10}},
      xaxis: {tickformat: '%Y-%m', hoverformat: '%Y-%m-%d'},
      margin: {t: 30, b: 40, l: 50, r: 20},
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    }

    return (
      <div>
        <div className="summary">
          <span>年化：{(annualized * 100.0).toFixed(2)}%</span>
          <span>夏普比：{sharpe.toFixed(2)}</span>
          <span>波动率：{(volatility * 100.0).toFixed(2)}%</span>
          <span>
            比较基准：
            <Select
              defaultValue="SH511880"
              style={{width: 120}}
              onChange={this.onBenchmarkSelected}
              options={[
                {value: 'SH511880', label: '活期存款'},
                {value: 'CSIH11001', label: '中证全债'},
                {value: 'SH510300', label: '沪深300'}
              ]}
              size={'small'}
            />
          </span>
        </div>
        <Plot className="curve" data={curveData} layout={curveLayout} style={{marginTop: '15px'}}
              config={{responsive: true}}/>
        <Plot className="holding" data={holdingData} layout={holdingLayout} style={{marginTop: '5px'}}
              onLegendClick={this.onHoldingClicked} config={{responsive: true}}/>
      </div>
    );
  }

}

export default TestingResultView
