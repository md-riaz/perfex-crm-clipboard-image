/* global tinymce, $, admin_url */
(function () {
  'use strict';

  var debug = /(?:^|[?&])clipboard_image_debug=1(?:&|$)/.test(location.search) || localStorage.getItem('clipboard_image_debug') === '1';
  function trace(event, data) {
    if (!debug) return;
    console.debug('[clipboard-image] ' + event, data || '');
  }

  if (debug && window.jQuery) {
    $(document).on('ajaxComplete.clipboardImage', function (_, xhr, settings) {
      if (/tasks\/(update_task_description|add_task_comment)|clipboard_image\/upload/.test(settings.url)) {
        trace('ajax-complete', {url: settings.url, status: xhr.status, response: xhr.responseText});
      }
    });
  }

  function taskId(editor) {
    var el = editor && editor.getElement && editor.getElement();
    var modal = el ? $(el).closest('#task-modal, #_task_modal') : $();
    var id = modal.find('#taskid, input[name="taskid"], input[name="id"]').first().val()
      || $('#task-modal #taskid, #_task_modal #taskid, #taskid').first().val()
      || $('.task-single-header[data-task-single-id]').first().data('task-single-id')
      || $('#task-modal, #_task_modal').first().data('task-id');
    if (!id) {
      var match = window.location.pathname.match(/tasks\/view\/(\d+)/);
      id = match && match[1];
    }
    return parseInt(id, 10) || 0;
  }

  function upload(id, file) {
    var data = new FormData();
    data.append('file', file, file.name || 'pasted-image.png');
    data.append('taskid', id);
    var csrf = window.csrfData || window.csrf_data || (window.app && app.csrfData);
    if (csrf && csrf.token_name && csrf.hash) data.append(csrf.token_name, csrf.hash);

    return $.ajax({
      url: admin_url + 'clipboard_image/upload',
      method: 'POST',
      data: data,
      processData: false,
      contentType: false,
      dataType: 'json'
    }).then(function (response) {
      if (!response.success || !response.location) return $.Deferred().reject(response.message || 'Image upload failed.');
      return response.location;
    });
  }

  function bind(editor) {
    if (!editor || editor.__clipboardImageBound) return;
    var id = taskId(editor);
    trace('bind', {editor: editor.id, taskId: id});
    if (!id) {
      trace('skip-no-task-id', {editor: editor.id});
      return;
    }
    editor.__clipboardImageBound = true;

    function paste(event) {
      var items = event && event.clipboardData && event.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].kind !== 'file' || items[i].type.indexOf('image/') !== 0) continue;
        var file = items[i].getAsFile();
        trace('paste-image', {editor: editor.id, taskId: id, type: items[i].type, name: file && file.name});
        event.preventDefault();
        event.stopPropagation();
        if (!file) return;
        trace('upload-start', {editor: editor.id, taskId: id});
        upload(id, file).done(function (url) {
          trace('upload-success', {editor: editor.id, taskId: id, url: url});
          editor.insertContent('<img src="' + url + '" alt="Pasted image">');
          editor.setDirty(true);
          if (editor.id === 'task_view_description' && editor.fire) editor.fire('blur');
          var source = editor.getElement && editor.getElement();
          if (source) source.value = editor.getContent();
          if (tinymce.triggerSave) tinymce.triggerSave();
          if (source) source.value = editor.getContent();
          editor.nodeChanged();
        }).fail(function (xhr) {
          trace('upload-failed', {editor: editor.id, taskId: id, status: xhr && xhr.status, response: xhr && xhr.responseText});
          if (window.alert_float) alert_float('danger', 'Image upload failed.');
        });
        return;
      }
    }

    editor.on('paste', paste);
    var doc = editor.getDoc && editor.getDoc();
    if (doc) doc.addEventListener('paste', paste, true);
  }

  function isTaskEditor(selector) {
    return selector === '#task_comment' || selector === '#task_view_description' ||
      (typeof selector === 'string' && selector.indexOf('#task_comment') !== -1);
  }

  function patchInit() {
    if (typeof tinymce === 'undefined' || !tinymce.init || tinymce.init.__clipboardImage) return;
    var init = tinymce.init;
    tinymce.init = function (options) {
      if (options && isTaskEditor(options.selector)) {
        var setup = options.setup;
        options.setup = function (editor) {
          if (setup) setup(editor);
          bind(editor);
        };
      }
      return init.call(this, options);
    };
    tinymce.init.__clipboardImage = true;
  }

  function bindTaskEditors() {
    if (typeof tinymce === 'undefined') return;
    ['task_comment', 'task_view_description'].forEach(function (id) {
      var editor = tinymce.get && tinymce.get(id);
      if (editor) bind(editor);
    });
  }

  var attempts = 0;
  var timer = setInterval(function () {
    patchInit();
    bindTaskEditors();
    if (++attempts > 200) clearInterval(timer);
  }, 100);
}());
