function commission(people: Array<number>) {
  const _people = people
  const strategyAry = []
  const rtn = {
    promote(strategy) {
      if (typeof strategy !== 'function') {
        throw new Error(`Invalid promote type`)
      }
      strategyAry.push(strategy)
      return rtn
    },
    getResult() {
      const result
      strategyAry.forEach(st => {
        result = (result ? result : _people).map(person => st(person))
      })
      return result.filter(val => val > 0)
    }
  }

  return rtn
}

const result = commission([1, 2, 5, 3])
  .promote(person => person - 1).getResult()

console.log(result)