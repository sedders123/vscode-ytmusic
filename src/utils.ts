import { KeyedCollection } from './types'

export class SimpleDictionary<T> implements KeyedCollection<T> {
  private items: { [index: string]: T } = {}

  public ContainsKey(key: string): boolean {
    return this.items.hasOwnProperty(key)
  }

  public Count(): number {
    return Object.keys(this.items).length
  }

  public Add(key: string, value: T) {
    this.items[key] = value
  }

  public Remove(key: string): void {
    delete this.items[key]
  }

  public Item(key: string): T | null | undefined {
    return this.items[key]
  }

  public Keys(): string[] {
    return Object.keys(this.items)
  }

  public Values(): T[] {
    return Object.values(this.items)
  }
}
