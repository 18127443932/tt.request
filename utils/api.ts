import { request } from './request'

type TestRes = {
  list: string[],
  total: number,
}
export function test(): Promise<TestRes> {
  return request({
    url: 'test',
    data: {
      page: 1,
      pageSize: 10
    }
  })
}