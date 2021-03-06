/**
* Copyright (c) Ascensio System SIA 2013. All rights reserved
*
* http://www.onlyoffice.com
*/

;(function(DocsAPI, window, document, undefined) {

    /*

        # Full #

        config = {
            type: 'desktop or mobile',
            width: '100% by default',
            height: '100% by default',
            documentType: 'text' | 'spreadsheet' | 'presentation',
            document: {
                title: 'document title',
                url: 'document url'
                fileType: 'document file type',
                options: <advanced options>,
                key: 'key',
                vkey: 'vkey',
                info: {
                    author: 'author name',
                    folder: 'path to document',
                    created: <creation date>,
                    sharingSettings: [
                        {
                            user: 'user name',
                            permissions: <permissions>
                        },
                        ...
                    ]
                },
                permissions: {
                    edit: <can edit>,
                    download: <can download>,
                    reader: <can view in readable mode>
                }
            },
            editorConfig: {
                mode: 'view or edit',
                lang: <language code>,
                canCoAuthoring: <can coauthoring documents>,
                canAutosave: <can autosave documents>,
                canBackToFolder: <can return to folder>,
                createUrl: 'create document url', // editor will add '?title={document title}&template={template name}&action=create', prevent to create a new document if empty
                sharingSettingsUrl: 'document sharing settings url',
                user: {
                    id: 'user id',
                    name: 'full user name'
                },
                recent: [
                    {
                        title: 'document title',
                        url: 'document url',
                        folder: 'path to document'
                    },
                    ...
                ],
                templates: [
                    {
                        name: 'template name',
                        icon: 'template icon url'
                    },
                    ...
                ],
                branding: {
                    logoUrl: 'header logo url', // default size 88 x 30
                    backgroundColor: 'header background color',
                    textColor: 'header text color'
                }
            },
            events: {
                'onReady': <document ready callback>,
                'onBack': <back to folder callback>,
                'onDocumentStateChange': <document state changed callback>,
                'onSave': <save request callback>
            }
        }

        # Embedded #

        config = {
            type: 'embedded',
            width: '100% by default',
            height: '100% by default',
            documentType: 'text' | 'spreadsheet' | 'presentation',
            document: {
                title: 'document title',
                url: 'document url',
                fileType: 'document file type',
                key: 'key',
                vkey: 'vkey'
            },
            editorConfig: {
                embedded: {
                     embedUrl: 'url',
                     fullscreenUrl: 'url',
                     saveUrl: 'url',
                     shareUrl: 'url',
                     toolbarDocked: 'top or bottom'
                }
            },
            events: {
                'onReady': <document ready callback>,
                'onBack': <back to folder callback>,
                'onError': <error callback>,
            }
        }
    */

    // TODO: allow several instances on one page simultaneously

    DocsAPI.DocEditor = function(placeholderId, config) {
        var _self = this,
            _config = config || {};

        extend(_config, DocsAPI.DocEditor.defaultConfig);

        var _onReady = function() {
            if (_config.type === 'mobile') {
                document.body.onfocus = function(e) {
                    setTimeout(function(){
                        iframe.contentWindow.focus();

                        _sendCommand({
                            command: 'resetFocus',
                            data: {}
                        })
                    }, 10);
                };
            }

            window.onmouseup = function(evt) {
                _processMouse(evt);
            };

            if (_config.editorConfig) {
                _init(_config.editorConfig);
            }

            if (_config.document) {
                _openDocument(_config.document);
            }
        };

        var _onMessage = function(msg) {
            if (msg) {
                var events = _config.events || {},
                    handler = events[msg.event],
                    res;

                if (msg.event === 'onRequestEditRights' && !handler) {
                    _applyEditRights(true, 'handler is\'n defined');
                } else {
                    if (msg.event === 'onReady') {
                        _onReady();
                    }

                    if (handler) {
                        res = handler.call(_self, { target: _self, data: msg.data });
                        if (msg.event === 'onSave' && res !== false) {
                            _processSaveResult(true);
                        }
                    }
                }
            }
        };


        var target = document.getElementById(placeholderId),
            iframe;

        if (target) {
            iframe = createIframe(_config);
            target.parentNode && target.parentNode.replaceChild(iframe, target);
            this._msgDispatcher = new MessageDispatcher(_onMessage, this);
        }


        /*
         cmd = {
         command: 'commandName',
         data: <command specific data>
         }
         */
        var _sendCommand = function(cmd) {
            if (iframe && iframe.contentWindow)
                postMessage(iframe.contentWindow, cmd);
        };

        var _init = function(editorConfig) {
            _sendCommand({
                command: 'init',
                data: {
                    config: editorConfig
                }
            });
        };

        var _openDocument = function(doc) {
            _sendCommand({
                command: 'openDocument',
                data: {
                    doc: doc
                }
            });
        };

        var _showError = function(title, msg) {
            _showMessage(title, msg, "error");
        };

        // severity could be one of: "error", "info" or "warning"
        var _showMessage = function(title, msg, severity) {
            if (typeof severity !== 'string') {
                severity = "info";
            }
            _sendCommand({
                command: 'showMessage',
                data: {
                    title: title,
                    msg: msg,
                    severity: severity
                }
            });
        };

        var _applyEditRights = function(allowed, message) {
            _sendCommand({
                command: 'applyEditRights',
                data: {
                    allowed: allowed,
                    message: message
                }
            });
        };

        var _processSaveResult = function(result, message) {
            _sendCommand({
                command: 'processSaveResult',
                data: {
                    result: result,
                    message: message
                }
            });
        };

        var _processRightsChange = function(enabled, message) {
            _sendCommand({
                command: 'processRightsChange',
                data: {
                    enabled: enabled,
                    message: message
                }
            });
        };

        var _processMouse = function(evt) {
            var r = iframe.getBoundingClientRect();
            var data = {
                type: evt.type,
                x: evt.x - r.left,
                y: evt.y - r.top
            };

            _sendCommand({
                command: 'processMouse',
                data: data
            });
        };

        var _serviceCommand = function(command, data) {
            _sendCommand({
                command: 'internalCommand',
                data: {
                    command: command,
                    data: data
                }
            });
        };

        return {
            showError           : _showError,
            showMessage         : _showMessage,
            applyEditRights     : _applyEditRights,
            processSaveResult   : _processSaveResult,
            processRightsChange : _processRightsChange,
            serviceCommand      : _serviceCommand
        }
    };


    DocsAPI.DocEditor.defaultConfig = {
        type: 'desktop',
        width: '640px',
        height: '480px'
    };


    MessageDispatcher = function(fn, scope) {
        var _fn     = fn,
            _scope  = scope || window;

        var _bindEvents = function() {
            if (window.addEventListener) {
                window.addEventListener("message", function(msg) {
                    _onMessage(msg);
                }, false)
            }
            else if (window.attachEvent) {
                window.attachEvent("onmessage", function(msg) {
                    _onMessage(msg);
                });
            }
        };

        var _onMessage = function(msg) {
            // TODO: check message origin
            if (msg && window.JSON) {

                try {
                    var msg = window.JSON.parse(msg.data);
                    if (_fn) {
                        _fn.call(_scope, msg);
                    }
                } catch(e) {}
            }
        };

        _bindEvents.call(this);
    };

    function getBasePath() {
        var scripts = document.getElementsByTagName('script'),
            match;

        for (var i = scripts.length - 1; i >= 0; i--) {
            match = scripts[i].src.match(/(.*)api\/documents\/api.js/i);
            if (match) {
                return match[1];
            }
        }

        return "";
    }

    function getExtensionPath() {
        if ("undefined" == typeof(extensionParams) || null == extensionParams["url"])
            return null;
        return extensionParams["url"] + "apps/";
    }

    function getAppPath(config) {
        var extensionPath = getExtensionPath(),
            path = extensionPath ? extensionPath : getBasePath(),
            appMap = {
                'text': 'documenteditor',
                'text-pdf': 'documenteditor',
                'spreadsheet': 'spreadsheeteditor',
                'presentation': 'presentationeditor'
            },
            app;

        if (typeof config.documentType === 'string') {
            app = appMap[config.documentType.toLowerCase()];
        }

        path += (app || appMap['text']) + "/";
        path += config.type === "mobile"
            ? "mobile"
            : config.type === "embedded"
                ? "embed"
                : "main";
        path += "/index.html";

        return path;
    }

    function getAppParameters(config) {
        var params = "?_dc=0";

        if (config.editorConfig && config.editorConfig.lang)
            params += "&lang=" + config.editorConfig.lang;

        return params;
    }

    function createIframe(config) {
        var iframe = document.createElement("iframe");

        iframe.src = getAppPath(config) + getAppParameters(config);
        iframe.width = config.width;
        iframe.height = config.height;
        iframe.align = "top";
        iframe.frameBorder = 0;

        return iframe;
    }

    function postMessage(wnd, msg) {
        if (wnd && wnd.postMessage && window.JSON) {
            // TODO: specify explicit origin
            wnd.postMessage(window.JSON.stringify(msg), "*");
        }

    }

    function extend(dest, src) {
        for (var prop in src) {
            if (src.hasOwnProperty(prop) && typeof dest[prop] === 'undefined') {
                dest[prop] = src[prop];
            }
        }
        return dest;
    }

})(window.DocsAPI = window.DocsAPI || {}, window, document);
