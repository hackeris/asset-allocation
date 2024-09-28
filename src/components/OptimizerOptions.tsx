import React from 'react'
import {InputNumber} from 'antd';
import {Options as OptimizerOptionsValue} from '../lib/modelCommon'
import './OptimizerOptions.css'


type Prop = {
  value: OptimizerOptionsValue,
  onOptionsChange: (options: OptimizerOptionsValue) => void | null
}

type State = {}

class OptimizerOptions extends React.Component<Prop, State> {

  onMinWeightChange = (value: number | null) => {
    const weight = value as number / 100.0;
    this.props.onOptionsChange({
      ...this.props.value,
      minWeight: weight
    })
  }
  onMaxWeightChange = (value: number | null) => {
    const weight = value as number / 100.0;
    this.props.onOptionsChange({
      ...this.props.value,
      maxWeight: weight
    })
  }
  onTurnoverConstraintChange = (value: number | null) => {
    const weight = value as number / 100.0;
    this.props.onOptionsChange({
      ...this.props.value,
      turnoverConstraint: weight
    })
  }
  onBackDaysChange = (value: number | null) => {
    const back = value || 60;
    this.props.onOptionsChange({
      ...this.props.value,
      back
    })
  }

  render() {

    const {minWeight, maxWeight, turnoverConstraint, back} = this.props.value;

    const minWeightPercent = minWeight * 100.0;
    const maxWeightPercent = maxWeight * 100.0;
    const turnoverConstraintPercent = turnoverConstraint * 100.0;

    return (
      <div className="mv-options">
        <div className="mv-options-item">
          <InputNumber prefix="最小权重：" suffix="%" style={{width: 150}} bordered={false}
                       value={minWeightPercent} size="middle"
                       min={0} max={100} onChange={this.onMinWeightChange}/>
        </div>
        <div className="mv-options-item">
          <InputNumber prefix="最大权重：" suffix="%" style={{width: 150}} bordered={false}
                       value={maxWeightPercent} size="middle"
                       min={0} max={100} onChange={this.onMaxWeightChange}/>
        </div>
        <div className="mv-options-item">
          <InputNumber prefix="模型回溯：" suffix="天" style={{width: 150}} bordered={false}
                       value={back} size="middle" precision={0}
                       min={0} max={250} onChange={this.onBackDaysChange}/>
        </div>
        <div className="mv-options-item">
          <InputNumber prefix="换手限制：" suffix="%" style={{width: 150}} bordered={false}
                       value={turnoverConstraintPercent} size="middle"
                       min={0} max={100} onChange={this.onTurnoverConstraintChange}/>
        </div>
      </div>
    );
  }
}

export default OptimizerOptions
