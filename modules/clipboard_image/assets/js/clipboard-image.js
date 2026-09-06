/* global tinymce, $, admin_url */
(function () {
  'use strict';

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
    if (!id) return;
    editor.__clipboardImageBound = true;

    function paste(event) {
      var items = event && event.clipboardData && event.clipboardData.items;
      if (!items) return;
      for (var i = 0; i < items.length; i++) {
        if (items[i].kind !== 'file' || items[i].type.indexOf('image/') !== 0) continue;
        event.preventDefault();
        event.stopPropagation();
        var file = items[i].getAsFile();
        if (!file) return;
        upload(id, file).done(function (url) {
          editor.insertContent('<img src="' + url + '" alt="Pasted image">');
          editor.setDirty(true);
          if (editor.id === 'task_view_description' && editor.fire) editor.fire('blur');
          var source = editor.getElement && editor.getElement();
          if (source) source.value = editor.getContent();
          if (tinymce.triggerSave) tinymce.triggerSave();
          if (source) source.value = editor.getContent();
          editor.nodeChanged();
        }).fail(function (message) {
          if (window.alert_float) alert_float('danger', message);
        });
        return;
      }
    }

    editor.on('paste', paste);
    var doc = editor.getDoc && editor.getDoc();
    if (doc) doc.addEventListener('paste', paste, true);
  }

  function bindTaskEditors() {
    if (typeof tinymce === 'undefined') return;
    var editors = Array.isArray(tinymce.editors) ? tinymce.editors : Object.keys(tinymce.editors || {}).map(function (key) {
      return tinymce.editors[key];
    });
    ['task_comment', 'task_view_description'].forEach(function (id) {
      var editor = tinymce.get && tinymce.get(id);
      if (editor && editors.indexOf(editor) < 0) editors.push(editor);
    });
    editors.forEach(function (editor) {
      if (/^(task_comment(?:_|$)|task_view_description$)/.test(editor.id || '')) bind(editor);
    });
  }

  var attempts = 0;
  var timer = setInterval(function () {
    bindTaskEditors();
    if (++attempts > 200) clearInterval(timer);
  }, 100);
}());
