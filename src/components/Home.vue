<template>
  <div class="aa-home">
    <div>
      <div>配置策略</div>

      <input type="radio" id="minimal_variance" value="minimal_variance" v-model="weightMethod"/>
      <label for="minimal_variance">风险最小化</label>

      <input type="radio" id="specified_weight" value="manual_specified" v-model="weightMethod"/>
      <label for="specified_weight">指定配比</label>

      <div v-if="weightMethod === 'minimal_variance'" class="weight-options">
        <label for="min_weight">最小比例</label>
        <input type="number" id="min_weight" v-model="minWeight"/>%
        <label for="max_weight">最大比例</label>
        <input type="number" id="max_weight" v-model="maxWeight"/>%
      </div>
    </div>
    <div>
      <div>资产列表</div>
      <input type="text" id="asset" v-model="inputAsset" placeholder="Code"/>
      <button v-on:click="onAddAsset">添加</button>
      <ul class="asset-candidates">
        <li v-for="item in assets" v-bind:key="item.code" class="asset-item">
          <div class="asset-symbol">
            {{ item.symbol }}
          </div>
          <div v-if="weightMethod === 'manual_specified'" class="asset-weight">
            <input type="number" v-model="item.weight">%
          </div>
          <div>
            <button v-on:click="remove(item.symbol)">x</button>
          </div>
        </li>
      </ul>
    </div>
    <div>
      <button v-on:click="runTest" :disabled="running">模拟</button>
    </div>
    <div>
      <p class="summary">
        <span>年化：{{ (result.annualized * 100.0).toFixed(2) }}%</span>
        <span>夏普比：{{ result.sharpe.toFixed(2) }}</span>
        <span>波动率：{{ (result.volatility * 100.0).toFixed(2) }}%</span>
      </p>
      <div class="curve" ref="curve">
      </div>
    </div>
  </div>
</template>

<script>
import backTesting from '@/lib/back-testing'
import Plotly from '@/lib/plotly'
import minimalVarianceOptimizer from '@/lib/minimal-variance'

export default {
  name: 'Home',
  data () {
    return {
      weightMethod: 'minimal_variance',
      minWeight: 5,
      maxWeight: 80,
      inputAsset: '',
      assets: [],
      running: false,
      result: {
        days: [],
        series: [],
        annualized: 0.0,
        sharpe: 0.0,
        volatility: 0.0
      }
    }
  },
  methods: {
    onAddAsset: function () {
      if (this.inputAsset !== '') {
        this.assets.push({
          symbol: this.inputAsset,
          weight: 0.0
        })
      }
      this.inputAsset = ''
    },
    runTest: async function () {
      this.running = true

      try {
        const assets = await Promise.all(
          this.assets
            .map(a => a.symbol)
            .map(async s => {
              const res = await fetch(`/api/asset/${s}/daily`)
              return res.json()
            })
        )

        let method
        if (this.weightMethod === 'manual_specified') {
          const weights = this.assets.map(a => parseFloat(a.weight) / 100.0)
          method = (s) => weights
        } else {
          method = minimalVarianceOptimizer({
            minWeight: this.minWeight / 100.0,
            maxWeight: this.maxWeight / 100.0
          })
        }

        const result = backTesting(assets, method)

        Object.assign(this.result, result)
      } catch (e) {
        alert('获取资产信息失败')
      }

      this.running = false
    },
    remove: function (symbol) {
      const index = this.assets.findIndex(a => a.symbol === symbol)
      if (index >= 0) {
        this.assets.splice(index, 1)
      }
    }
  },
  watch: {
    running: function () {
      const refs = this.$refs
      if (this.running || this.result.days.length === 0) {
        Plotly.purge(refs.curve)
      } else {
        const result = this.result
        this.$nextTick(() => {
          Plotly.newPlot(refs.curve, [{
            x: result.days,
            y: result.series,
            mode: 'lines'
          }], {
            title: '模拟收益',
            yaxis: {tickformat: '.2%', tickfont: {size: 10}},
            xaxis: {tickformat: '%Y-%m', hoverformat: '%Y-%m-%d'},
            margin: {t: 30, b: 40, l: 50, r: 20},
            paper_bgcolor: 'rgba(0,0,0,0)',
            plot_bgcolor: 'rgba(0,0,0,0)'
          })
        })
      }
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>

.aa-home {
  width: 800px;
  margin: 60px auto;
}

.aa-home > div {
  margin: 10px 0;
}

ul {
  list-style-type: none;
  padding: 0;
  margin: 5px 0;
}

li {
  margin: 5px;
  height: 25px;
}

.asset-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.asset-weight > input {
  width: 40px;
}

.weight-options > input {
  width: 40px;
}

.summary > span {
  padding: 0 10px;
}

.curve {
  margin-top: 5px;
  height: 400px;
}
</style>
