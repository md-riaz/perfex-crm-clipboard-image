<?php

defined('BASEPATH') or exit('No direct script access allowed');

class Clipboard_image extends AdminController
{
    public function __construct()
    {
        parent::__construct();
        $this->load->model(['tasks_model', 'misc_model']);
        $this->load->helper('upload');
    }

    public function upload()
    {
        if (!$this->input->is_ajax_request() || !staff_can('view', 'tasks')) {
            ajax_access_denied();
        }

        $taskId = (int) $this->input->post('taskid');
        if (!$taskId || !staff_can('edit', 'tasks')) {
            ajax_access_denied();
        }

        $task = $this->tasks_model->get($taskId);
        if (!$task || !isset($_FILES['file'])) {
            $this->respond_error(_l('file_not_uploaded'));
            return;
        }

        // Perfex's legacy unique_filename() can attempt to increment an empty
        // suffix when the pasted filename already exists. Give pasted files a
        // collision-resistant name before handing them to the core uploader.
        if (!is_array($_FILES['file']['name'])) {
            $originalName = (string) $_FILES['file']['name'];
            $extension = strtolower(pathinfo($originalName, PATHINFO_EXTENSION));
            $_FILES['file']['name'] = 'clipboard-' . date('YmdHis') . '-' . bin2hex(random_bytes(4)) . ($extension ? '.' . $extension : '.png');
        }

        $files = handle_task_attachments_array($taskId, 'file');
        if (!$files || count($files) !== 1) {
            $this->respond_error(_l('file_not_uploaded'));
            return;
        }

        $file = $files[0];
        $path = get_upload_path_by_type('task') . $taskId . '/' . $file['file_name'];
        if (!is_image($path)) {
            @unlink($path);
            $this->respond_error(_l('invalid_file_type'));
            return;
        }

        $attachmentId = $this->misc_model->add_attachment_to_database($taskId, 'task', [$file]);
        if (!$attachmentId) {
            @unlink($path);
            $this->respond_error(_l('file_not_uploaded'));
            return;
        }

        $this->db->where('id', $attachmentId);
        $attachment = $this->db->get(db_prefix() . 'files')->row();
        if (!$attachment) {
            @unlink($path);
            $this->respond_error(_l('file_not_uploaded'));
            return;
        }

        // Every clipboard image is inline editor content. It must not be
        // returned by Perfex's task attachment query, regardless of whether
        // it came from the comment or description editor.
        $this->db->where('id', (int) $attachmentId);
        $this->db->update(db_prefix() . 'files', ['rel_type' => 'clipboard_image']);

        // Root-relative keeps the module route stable from nested admin pages.
        $location = '/admin/clipboard_image/image/' . $attachment->attachment_key;

        $this->output
            ->set_content_type('application/json')
            ->set_output(json_encode([
                'success'      => true,
                'attachmentId' => (int) $attachmentId,
                'location'     => $location,
            ]));
    }

    public function image($key)
    {
        $key = preg_replace('/\.(png|jpe?g|gif|webp)$/i', '', (string) $key);
        if (!is_staff_logged_in()) {
            show_404();
        }

        $this->db->where('attachment_key', $key);
        $this->db->where_in('rel_type', ['task', 'clipboard_image']);
        $attachment = $this->db->get(db_prefix() . 'files')->row();
        if (!$attachment) {
            show_404();
        }

        $path = get_upload_path_by_type('task') . $attachment->rel_id . '/' . $attachment->file_name;
        if (!is_file($path) || !is_image($path)) {
            show_404();
        }

        $mime = function_exists('mime_content_type') ? mime_content_type($path) : $attachment->filetype;
        header('Content-Type: ' . $mime);
        header('Content-Disposition: inline; filename="' . basename($attachment->file_name) . '"');
        header('Content-Length: ' . filesize($path));
        header('Cache-Control: private, max-age=3600');
        readfile($path);
        exit;
    }

    private function respond_error($message)
    {
        $this->output
            ->set_status_header(422)
            ->set_content_type('application/json')
            ->set_output(json_encode(['success' => false, 'message' => $message]));
    }
}
