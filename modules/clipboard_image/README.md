# Clipboard Image Upload

Paste clipboard images directly into Perfex CRM task description and task comment TinyMCE editors.

## Installation

1. Copy this directory to `modules/clipboard_image`.
2. Open **Setup > Modules**.
3. Activate **Clipboard Image Upload**.
4. Open an existing task, focus the description or comment editor, and paste an image.

Images are uploaded as task files and TinyMCE stores the protected preview URL inline. New task descriptions cannot upload inline images until the task has been created because no task ID exists before submission.

The module does not create database tables and preserves existing attachments when deactivated.
