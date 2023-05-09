import { test } from '../../utils/api'
Page({
  data: {

  },
  onLoad: function () {
    // 第一个会被取消
    test().then(res => {
      console.log('test1: ', res)
    })
    test().then(res => {
      console.log('test2: ', res)
    })
  },
})