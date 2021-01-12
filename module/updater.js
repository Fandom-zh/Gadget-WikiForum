const { conf } = require('./mw')
const { log, error } = require('./log')
const actionEdit = require('./actionEdit')

/**
 * @module updater 更新器
 *
 * @description
 * 为了避免老版本jQuery的XSS漏洞
 * forumEl->wikitext的过程采用String拼接的方式
 */

/**
 * @function handleEdit 处理forumEl并发布
 * @param {Object} forumEl
 */
function handleEdit(forumEl, summary) {
  const pageName = forumEl[0].meta.pageName
  const wikitext = parseAllForums(forumEl)

  actionEdit({
    title: pageName,
    text: wikitext,
    summary,
  }).then(
    ret => {
      if (ret.error || ret.errors) {
        error(ret.error || ret.errors)
        return
      }
      log('更新论坛成功', ret)
      const { fromPage } = require('./renderer')
      fromPage(pageName)
    },
    err => error
  )
}

/**
 * @function parseAllForums
 */
function parseAllForums(forumEl) {
  var html = ''
  $.each(forumEl, (index, forum) => {
    html += parseForum(forum)
  })

  html = `<!--
 - WikiForum Container
 - 
 - Total Forums: ${forumEl.length}
 - Last modiflied: ${timeStamp()}
 - Last user: ${conf.wgUserName}
 -
 - DO NOT EDIT DIRECTLY
 -->
${html}

<!-- end WikiForum -->`

  return html
}

function parseForum(forum) {
  const { forumid, meta, threads } = forum
  const metaList = getMeta(meta)

  var threadList = ''
  $.each(threads, (index, thread) => {
    threadList += parseThread(thread)
  })

  const html = `
<!-- start forum#${forumid || 'latest'} -->
<div class="wiki-forum" ${metaList}>
${threadList}
</div>
<!-- end forum#${forumid || 'latest'} -->`

  return html
}

function parseThread(thread, indent = 0) {
  const { threadid, meta, threads, content } = thread
  const metaList = getMeta(meta)

  var indentStr = ''
  for (let i = 0; i < indent; i++) indentStr += '  '

  var reply = ''
  if (threads && threads.length > 0) {
    $.each(threads, (index, thread) => {
      reply += parseThread(thread, indent + 1)
    })
  }

  var html = `
${indentStr}<!-- start thread#${threadid || 'latest'} -->
${indentStr}<div class="forum-thread" ${metaList}>
${indentStr}  <div class="forum-content">
<!-- start content -->
${content}
<!-- end content -->
${indentStr}  </div>${reply}
${indentStr}</div>
${indentStr}<!-- end thread#${threadid || 'latest'} -->
`

  return html
}

/**
 * @function getMeta 将meta转换为 data-*="" 字符串
 * @param {Object} meta jQuery.data()
 */
function getMeta(meta) {
  // 将 fooBar 转换为 foo-bar 的形式
  var metaList = []

  $.each(meta, (key, val) => {
    let newKey =
      'data-' + key.replace(/(.*)([A-Z])(.*)/g, '$1-$2$3').toLowerCase()
    metaList.push(`${newKey}="${val}"`)
  })

  metaList = metaList.join(' ')

  return metaList
}

function timeStamp() {
  return new Date().toISOString()
}

function isComplex(id, depthMax) {
  id = id.split('-')
  if (id.length > depthMax) return true
  return false
}

/**
 * @function updateThread 编辑内容
 */
function updateThread({ forumEl, forumid = '1', threadid, content }) {
  const { wikitext } = forumEl
  // 将 id 调整为程序可读的 index
  forumid = Number(forumid)
  forumid--
  const forum = wikitext[forumid]

  function findAndUpdate({ threadid, content }, base) {
    var allThreads = base.threads
    $.each(allThreads, (index, item) => {
      if (item.threadid === threadid) {
        item.content = content
        item.meta.userLast = conf.wgUserName
        item.meta.timeModify = timeStamp()
      } else if (item.threads) {
        findAndUpdate({ threadid, content }, item)
      }
    })
  }

  findAndUpdate({ threadid, content }, forum)

  log('Update thread', { forumid, threadid, content })
  handleEdit(
    wikitext,
    `[WikiForum] Modify forum#${forumid} > thread#${threadid}`
  )
}

/**
 * @function addThread 盖新楼，回复楼主
 */
function addThread({ forumEl, forumid, content }) {
  const { wikitext } = forumEl
  forumid = Number(forumid)
  forumid--

  wikitext[forumid].threads.push({
    meta: {
      userAuthor: conf.wgUserName,
      userLast: conf.wgUserName,
      timePublish: timeStamp(),
      timeModify: timeStamp(),
    },
    content,
  })

  log('Add thread', { forumid, content })

  handleEdit(wikitext, `[WikiForum] Add thread to forum#${forumid}`)
}

/**
 * @function addReply 新回复，回复层主
 */
function addReply({ forumEl, forumid = '1', threadid, content }) {
  const { wikitext } = forumEl
  // 给楼主回复其实就是盖新楼
  if (threadid === '1') {
    return addThread({ forumEl, forumid, content })
  }

  forumid = Number(forumid)
  forumid--

  const forum = wikitext[forumid]

  function findAndUpdate({ threadid, content }, base) {
    var allThreads = base.threads
    $.each(allThreads, (index, item) => {
      if (item.threadid === threadid) {
        item.threads = item.threads || []
        item.threads.push({
          meta: {
            userAuthor: conf.wgUserName,
            userLast: conf.wgUserName,
            timePublish: timeStamp(),
            timeModify: timeStamp(),
          },
          content,
        })
      } else if (item.threads) {
        findAndUpdate({ threadid, content }, item)
      }
    })
  }

  findAndUpdate({ threadid, content }, forum)

  log('Add reply', { forumid, threadid, content })

  handleEdit(
    wikitext,
    `[WikiForum] Add reply to forum#${forumid} > thread#${threadid}`
  )
}

module.exports = {
  addReply,
  newReply: addReply,
  addThread,
  newThread: addThread,
  updateThread,
  // deleteThread,
}
