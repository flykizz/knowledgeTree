function commission(people: Array<number>) {
  return {
    promote() {
      return {
        getResult() {
          return people.map(val => val - 1).filter(val => val > 0)
        }
      }
    }
  }
}

function obversable(fn: { (next): void }) {
  let _subFn
  fn(val => {
    _subFn(val)
  })
  return {
    subscribe(fn) {
      _subFn = fn
    }
  }
}

obversable(next => {
  setTimeout(() => next([1, 2, 5, 3]),100)//
  setTimeout(() => next([4,5,6]),3000)
}).subscribe(val => {
  const result = commission(val).promote().getResult()
  console.log(result)
})