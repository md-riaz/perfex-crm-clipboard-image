<?php

/**
 * Module Name: Clipboard Image Upload
 * Description: Paste images directly into task editors.
 * Version: 1.2.4
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

function clipboard_image_allow_local_host($config)
{
    $config->set('Core.AllowHostnameUnderscore', true);
    return $config;
}

hooks()->add_action('app_admin_footer', 'clipboard_image_add_assets');

function clipboard_image_add_assets()
{
    static $loaded = false;
    if ($loaded) {
        return;
    }
    $loaded = true;
    echo '<script src="' . e(CLIPBOARD_IMAGE_MODULE_URL . 'assets/js/clipboard-image.js') . '?v=1.2.4"></script>';
}


