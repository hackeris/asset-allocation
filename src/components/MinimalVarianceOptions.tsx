import React from 'react'
import {InputNumber} from 'antd';
import {Options as MinimalVarianceOptionsValue} from '../lib/minimalVariance'
import './MinimalVarianceOptions.css'


type Prop = {
  value: MinimalVarianceOptionsValue,
  onOptionsChange: (options: MinimalVarianceOptionsValue) => void | null
}

type State = {}

class MinimalVarianceOptions extends React.Component<Prop, State> {

  onMinWeightChange = (value: number | null) => {
    const weight = value as number;
    this.props.onOptionsChange({
      ...this.props.value,
      minWeight: weight
    })
  }
  onMaxWeightChange = (value: number | null) => {
    const weight = value as number;
    this.props.onOptionsChange({
      ...this.props.value,
      maxWeight: weight
    })
  }
  onTurnoverConstraintChange = (value: number | null) => {
    const weight = value as number;
    this.props.onOptionsChange({
      ...this.props.value,
      turnoverConstraint: weight
    })
  }

  render() {

    const {minWeight, maxWeight, turnoverConstraint} = this.props.value;

    const minWeightPercent = minWeight * 100.0;
    const maxWeightPercent = maxWeight * 100.0;
    const turnoverConstraintPercent = turnoverConstraint * 100.0;

    return (
      <div className="mv-options">
        <div className="mv-options-item">
          <p>最小权重：</p>
          <InputNumber suffix="%" value={minWeightPercent} size="middle"
                       min={0} max={100} onChange={this.onMinWeightChange}/>
        </div>
        <div className="mv-options-item">
          <p>最大权重：</p>
          <InputNumber suffix="%" value={maxWeightPercent} size="middle"
                       min={0} max={100} onChange={this.onMaxWeightChange}/>
        </div>
        <div className="mv-options-item">
          <p>换手限制：</p>
          <InputNumber suffix="%" value={turnoverConstraintPercent} size="middle"
                       min={0} max={100} onChange={this.onTurnoverConstraintChange}/>
        </div>
      </div>
    );
  }
}

export default MinimalVarianceOptions
