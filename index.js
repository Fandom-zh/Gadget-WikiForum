/** Localization support is not yet complete */

'use strict'

/**
 * @name WikiForum
 * @author 机智的小鱼君 <dragon-fish@qq.com>
 * @description Provide the forum similar to the Community Feed, and support wikitext!!!
 *
 * @license CC BY-SA
 * @url https://github.com/Wjghj-Project/Gadget-WikiForum
 */
!(() => {
  // init global variable
  window.WikiForum = {
    cache: {
      pages: {},
      avatar: {},
    },
    loadPage: require('./module/loadPage'),
    parser: require('./module/parser'),
  }
  // Auto load
  require('./module/autoLoad')()
})()