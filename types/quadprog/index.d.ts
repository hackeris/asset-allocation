interface Solution {
  solution: number[],
  Lagrangian: number[],
  value: number[],
  unconstrained_solution: number[][],
  iterations: number[],
  iact: number[],
  message: string
}

declare module 'quadprog' {
  export function solveQP(Dmat: number[][], dvec: number[], Amat: number[][], bvec: number[], meq: number | null = null, factorized: number[] | null = null): Solution
}
