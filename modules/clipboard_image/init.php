<?php

/**
 * Module Name: Clipboard Image Upload
 * Description: Paste images directly into task editors.
 * Version: 1.0.2
 * Author: md-riaz
 * Requires at least: 2.3.0
 */

defined('BASEPATH') or exit('No direct script access allowed');

/**
 * Clipboard Image Upload for Perfex CRM.
 *
 * Uploads images pasted into supported TinyMCE task editors and inserts the
 * protected stored image URL instead of a base64 data URI.
 */

define('CLIPBOARD_IMAGE_MODULE_NAME', 'clipboard_image');
define('CLIPBOARD_IMAGE_MODULE_PATH', module_dir_path(CLIPBOARD_IMAGE_MODULE_NAME));

define('CLIPBOARD_IMAGE_MODULE_URL', module_dir_url(CLIPBOARD_IMAGE_MODULE_NAME));

// Allow the local Laragon hostname used by this installation. The underscore
// in perfex_crm.test is rejected by HTMLPurifier's default hostname validator;
// this module owns the exception instead of changing core purifier code.
hooks()->add_filter('html_purifier_config', 'clipboard_image_allow_local_host');
hooks()->add_filter('before_update_task', 'clipboard_image_trace_task_update', 10, 2);

function clipboard_image_allow_local_host($config)
{
    $config->set('Core.AllowHostnameUnderscore', true);
    return $config;
}

function clipboard_image_trace_task_update($data, $taskId)
{
    $description = (string) ($data['description'] ?? '');
    log_message('debug', sprintf(
        '[clipboard_image] before_update_task task=%d len=%d has_img=%s src=%s content=%s',
        (int) $taskId,
        strlen($description),
        strpos($description, '<img') !== false ? 'yes' : 'no',
        preg_match_all('/<img[^>]+src=["\']([^"\']+)/i', $description, $matches) ? implode(',', $matches[1]) : '-',
        substr($description, 0, 1000)
    ));

    return $data;
}

hooks()->add_action('app_admin_footer', 'clipboard_image_add_assets');

function clipboard_image_add_assets()
{
    static $loaded = false;
    if ($loaded) {
        return;
    }
    $loaded = true;
    echo '<script src="' . e(CLIPBOARD_IMAGE_MODULE_URL . 'assets/js/clipboard-image.js') . '?v=1.0.2"></script>';
}


