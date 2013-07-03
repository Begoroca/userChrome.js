// ==UserScript==
// @name           SaveUserChromeJS.uc.js
// @author         ywzhaiqi
// @description    像 Greasemonkey 一样保存 uc脚本
// @include        main
// @charset        UTF-8
// ==/UserScript==

(function() {


let { classes: Cc, interfaces: Ci, utils: Cu, results: Cr } = Components;
if (!window.Services) Cu.import("resource://gre/modules/Services.jsm");

if(typeof window.saveUserChromeJS != "undefined"){
	window.saveUserChromeJS.uninit();
	delete window.saveUserChromeJS;
}

const RE_USERCHROME_JS = /\.uc(?:-\d+)?\.(?:js|xul)$/;
const RE_CONTENTTYPE = /text\/html/i;

var ns = window.saveUserChromeJS = {
	_menuitem: null,
	get SCRIPTS_FOLDER() {
		delete this.SCRIPTS_FOLDER;
		return this.SCRIPTS_FOLDER = Services.dirsvc.get("UChrm", Ci.nsILocalFile);
	},

	init: function() {
		Services.obs.addObserver(this, "content-document-global-created", false);
		Services.obs.addObserver(this, "install-userChromeJS", false);

		gBrowser.mPanelContainer.addEventListener('DOMContentLoaded', this, true);

		this.createMenuitem();

		var contextMenu = $("contentAreaContextMenu");
		contextMenu.insertBefore(this._menuitem, contextMenu.firstChild);
		contextMenu.addEventListener("popupshowing", this, false);
	},
	uninit: function(){
		Services.obs.removeObserver(this, "content-document-global-created");
		Services.obs.removeObserver(this, "install-userChromeJS");

		gBrowser.mPanelContainer.removeEventListener('DOMContentLoaded', this, true);
	},
	handleEvent: function(event){
		switch(event.type){
			case "DOMContentLoaded":
				var doc = event.target;
				var win = doc.defaultView;
				if(win != win.parent) return;
				if(!checkDoc(doc)) return;

				if(win.location.hostname == 'github.com'){
					this.addButton_github(doc);

					// github 用了 history.pushstate, 需要加载页面后重新添加按钮
					var script = '\
                        (function(){\
                            var $ = unsafeWindow.jQuery;\
                            if(!$) return;\
                            $(document).on("pjax:success", function(){\
                                addButton_github(document);\
                            });\
                        })();\
                    ';
					let sandbox = new Cu.Sandbox(win, {sandboxPrototype: win});
					sandbox.unsafeWindow = win.wrappedJSObject;
					sandbox.document     = win.document;
					sandbox.window       = win;
					sandbox.addButton_github = ns.addButton_github;
					Cu.evalInSandbox(script, sandbox);
				}
				break;
			case "popupshowing":
				if (event.target != event.currentTarget) return;
				if(gContextMenu.onLink){
					this._menuitem.hidden = !RE_USERCHROME_JS.test(gContextMenu.linkURL) || !/\/raw\//.test(gContextMenu.linkURL);
				}else{
					this._menuitem.hidden = true;
				}
				break;
		}
	},
	observe: function(aSubject, aTopic, aData) {
		switch (aTopic) {
			case "content-document-global-created":
				let safeWin = aSubject;
				let chromeWin = this.getBrowserForContentWindow(safeWin).wrappedJSObject;
				if (!chromeWin) return;

				let gBrowser = chromeWin.gBrowser;
				if (!gBrowser) return;

                let lhref = safeWin.location.href;
                if(lhref.startsWith("view-source")) return;

				// Show the scriptish install banner if the user is navigating to a .user.js
				// file in a top-level tab.
				if (safeWin === safeWin.top && RE_USERCHROME_JS.test(lhref) && !RE_CONTENTTYPE.test(safeWin.document.contentType)) {
                    safeWin.setTimeout(function(self){
						self.showInstallBanner(
							gBrowser.getBrowserForDocument(safeWin.document));
					}, 500, this);
				}

				break;
			case "install-userChromeJS":
				let win = this.getMostRecentWindow("navigator:browser");
				if (win) this.saveScript();
				break;
		}
	},
	createMenuitem: function(){
		var menuitem = $C("menuitem", {
			id: "uc-install-menu",
			label: "Installieren für userChromeJS...",
			accessKey: "I",
			oncommand: "saveUserChromeJS.saveScript(gContextMenu.linkURL)"
		});

		return this._menuitem = menuitem;
	},
	showInstallBanner: function(browser) {
		var notificationBox = gBrowser.getNotificationBox(browser);
		var greeting = "Das ist ein userChrome Script. Klicken Sie auf Installieren, um es zu verwenden. Nach dem Speichern im Chrome Ordner bitte einen Neustart durchführen.";
		var btnLabel = "Installieren";

		// Remove existing notifications. Notifications get removed
		// automatically onclick and on page navigation, but we need to remove
		// them ourselves in the case of reload, or they stack up.
		for (var i = 0, child; child = notificationBox.childNodes[i]; i++)
			if (child.getAttribute("value") == "install-userChromeJS")
				notificationBox.removeNotification(child);

		var notification = notificationBox.appendNotification(
			greeting,
			"install-userChromeJS",
			null,
			notificationBox.PRIORITY_WARNING_MEDIUM, [{
				label: btnLabel,
				accessKey: "I",
				popup: null,
				callback: this.saveCurrentScript
			}
		]);
	},
	addButton_github: function(doc){
		if(doc.getElementById("uc-install-button")) return;

		var rawBtn = doc.getElementById("raw-url");
		if(!rawBtn) return;

		var downURL = rawBtn.href;
		if(!RE_USERCHROME_JS.test(downURL)) return;

		var installBtn = doc.createElement("a");
		installBtn.setAttribute("id", "uc-install-button");
		installBtn.setAttribute("class", "minibutton");
		installBtn.setAttribute("href", "#");
		installBtn.innerHTML = "Installieren";
		installBtn.addEventListener("click", function(event){
			event.preventDefault();
			ns.saveScript(downURL);
		}, false);

		rawBtn.parentNode.insertBefore(installBtn, rawBtn);
	},
	saveCurrentScript: function(event){
		ns.saveScript();
	},
	saveScript: function(url) {
		var win = ns.getFocusedWindow();

		var doc, name, fileName, fileExt, charset;
		if(!url){
			url = win.location.href;
			doc = win.document;
			name = /\/\/\s*@name\s+(.*)/i.exec(doc.body.textContent);
			charset = /\/\/\s*@charset\s+(.*)/i.exec(doc.body.textContent);
		}

		name = name && name[1] ? name[1] : decodeURIComponent(url.split("/").pop());
        fileName = name.replace(/\.uc\.(js|xul)$|$/i, ".uc.$1").replace(/\s/g, '_').toLowerCase();
		fileExt = name.match(/\.uc\.(js|xul)$/i);
        fileExt = fileExt && fileExt[1] ? fileExt[1] : "js";
        charset = charset && charset[1] ? charset[1] : "UTF-8";

		// https://developer.mozilla.org/ja/XUL_Tutorial/Open_and_Save_Dialogs
		var fp = Cc["@mozilla.org/filepicker;1"].createInstance(Ci.nsIFilePicker);
		fp.init(window, "", Ci.nsIFilePicker.modeSave);
		// bei einigen Benutzern (Win7) macht die folgende Zeile bei der Dateinamenvergabe Probleme, deshalb deaktiviert
		//fp.appendFilter("*." + fileExt, "*.uc.js;*.uc.xul");
		fp.appendFilters(Ci.nsIFilePicker.filterAll);
		fp.displayDirectory = ns.SCRIPTS_FOLDER; // nsILocalFile
		fp.defaultExtension = fileExt;
		fp.defaultString = fileName;
		var callbackObj = {
			done: function(res) {
				if (res != fp.returnOK && res != fp.returnReplace) return;

				var wbp = Cc["@mozilla.org/embedding/browser/nsWebBrowserPersist;1"].createInstance(Ci.nsIWebBrowserPersist);
				wbp.persistFlags = wbp.PERSIST_FLAGS_AUTODETECT_APPLY_CONVERSION;

                var uri;
                if(doc && fileExt != 'xul'){
                    uri = doc.documentURIObject;
                }else{
                    uri = Services.io.newURI(url, null, null);
                }

				var loadContext = win.QueryInterface(Ci.nsIInterfaceRequestor)
					.getInterface(Ci.nsIWebNavigation)
					.QueryInterface(Ci.nsILoadContext);
				wbp.saveURI(uri, null, uri, null, null, fp.file, loadContext);

                // // TODO： 需要保存完毕后调用。
                // if(fileExt == 'js'){
                //     setTimeout(function(){
                //         ns.handleSavedScript(fp.file, charset);
                //     }, 500);
                // }
			}
		};
		fp.open(callbackObj);
	},
    handleSavedScript: function(file, charset){
        window.userChrome_js.getScripts();

        var dir = file.parent.leafName;
        if(dir.toLowerCase() == 'chrome' || (dir in window.userChrome_js.arrSubdir)){
            let context = {};
            Services.scriptloader.loadSubScript( "file:" + file.path, context, charset || "UTF-8");
            alert("Script laden");
        }
    },
	getFocusedWindow: function() {
		var win = document.commandDispatcher.focusedWindow;
		return (!win || win == window) ? content : win;
	},
	getMostRecentWindow: function(){
		return Services.wm.getMostRecentWindow("navigator:browser")
	},
	getBrowserForContentWindow: function(aContentWindow) {
	  return aContentWindow
	      .QueryInterface(Ci.nsIInterfaceRequestor)
	      .getInterface(Ci.nsIWebNavigation)
	      .QueryInterface(Ci.nsIDocShellTreeItem)
	      .rootTreeItem
	      .QueryInterface(Ci.nsIInterfaceRequestor)
	      .getInterface(Ci.nsIDOMWindow)
	      .QueryInterface(Ci.nsIDOMChromeWindow);
	}
};


function $(id) document.getElementById(id);
function $C(name, attr) {
	var el = document.createElement(name);
	if (attr) Object.keys(attr).forEach(function(n) el.setAttribute(n, attr[n]));
	return el;
}

function log(arg) Application.console.log("[SaveUserChromeJS]" + arg);

function checkDoc(doc) {
	if (!(doc instanceof HTMLDocument)) return false;
	if (!window.mimeTypeIsTextBased(doc.contentType)) return false;
	if (!doc.body || !doc.body.hasChildNodes()) return false;
	if (doc.body instanceof HTMLFrameSetElement) return false;
	return true;
}


})();


window.saveUserChromeJS.init();
