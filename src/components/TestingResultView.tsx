import React from "react";
import {TestingResult} from "../lib/backTesting";
import Plot from 'react-plotly.js'

import './TestingResultView.css'

type Prop = {
  result: TestingResult | null
}

class TestingResultView extends React.Component<Prop, any> {

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
      name: '组合'
    }, {
      x: days,
      y: benchmark,
      mode: 'lines',
      name: benchmarkName
    }]
    const curveLayout = {
      title: '模拟收益',
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
      title: '历史持仓',
      yaxis: {tickformat: '.2%', tickfont: {size: 10}},
      xaxis: {tickformat: '%Y-%m', hoverformat: '%Y-%m-%d'},
      margin: {t: 30, b: 40, l: 50, r: 20},
      paper_bgcolor: 'rgba(0,0,0,0)',
      plot_bgcolor: 'rgba(0,0,0,0)'
    }

    return (
      <div>
        <p className="summary">
          <span>年化：{(annualized * 100.0).toFixed(2)}%</span>
          <span>夏普比：{sharpe.toFixed(2)}</span>
          <span>波动率：{(volatility * 100.0).toFixed(2)}%</span>
        </p>
        <Plot className="curve" data={curveData} layout={curveLayout}/>
        <Plot className="holding" data={holdingData} layout={holdingLayout}/>
      </div>
    );
  }

}

export default TestingResultView
