interface I_Strategy {
  execute<T>(people: Array<T>): Array<T>
}

class Commission<T> {
  private people: Array<T>

  private result: Array<T>

  constructor(people: Array<T>) {
    this.people = people
  }

  promote(strategy: I_Strategy) {
    this.result = strategy.execute(this.people)
  }

  getResult(): Array<T> {
    return this.result
  }
}

class Strategy2019 implements I_Strategy {
  execute<T>(people: Array<T>) {
    return people.map(val => val - 1).filter(val => val > 0)
  }
}

class Strategy2020 implements I_Strategy {
  execute<T>(people: Array<T>) {
    return people.map(val => val - 2).filter(val => val > 0)
  }
}


new Commission([1, 2]).promote(new Strategy2019())

new Commission([3, 4]).promote(new Strategy2020())