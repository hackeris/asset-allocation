function partition(returns: number[], granularity: number): number[][] {
  const result: number[][] = []
  for (let i = 0; i < returns.length; i++) {
    if (i % granularity === 0) {
      result.push([])
    }
    result[result.length - 1].push(returns[i])
  }
  return result
}

function transformGranularity(returns: number[], granularity: number): number[] {

  const partitioned = partition(returns, granularity);

  return partitioned.map(part => {
    return part.reduce((a, r) => (a + 1) * (r + 1) - 1, 0.0)
  });
}

export default transformGranularity;
