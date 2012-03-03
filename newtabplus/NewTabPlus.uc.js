// ==UserScript==
// @description  NewTabPlus.uc.js
// @description �V�����^�u�ŊJ���i�󔒃^�u�𗘗p�j
// @include		chrome://browser/content/browser.xul
// @include 		chrome://browser/content/bookmarks/bookmarksPanel.xul
// @include 		chrome://browser/content/history/history-panel.xul
// @include 		chrome://browser/content/places/places.xul
// @compatibility	Firefox 4.0
// ==/UserScript==

(function() {

    /* �u�b�N�}�[�N��������V�����^�u�ŊJ�� */
    try {
  	var str = openLinkIn.toString();
		  str = str.replace('w.gBrowser.selectedTab.pinned',
	        '(!w.isTabEmpty(w.gBrowser.selectedTab) || $&)');
		  str = str.replace(/&&\s+w\.gBrowser\.currentURI\.host != uriObj\.host/,'');
		  eval("openLinkIn = " + str);
    }catch(e){}

    /* URL�o�[����V�����^�u�ŊJ�� */
    try {
		location=="chrome://browser/content/browser.xul"&&eval("gURLBar.handleCommand="+gURLBar.handleCommand.toString().replace(/^\s*(load.+);/gm,"/^javascript:/.test(url)||content.location=='about:blank'?$1:gBrowser.loadOneTab(url, {postData: postData, inBackground: false, allowThirdPartyFixup: true});"))
    }catch(e){}

    /* �����o�[����V�����^�u�ŊJ�� */
    try {
        var searchbar = document.getElementById("searchbar");
        eval("searchbar.handleSearchCommand="+searchbar.handleSearchCommand.
            toString().replace(/this.doSearch\(textValue, where\);/,
            "if (!gBrowser.webProgress.isLoadingDocument && gBrowser.curren"
            +"tURI.spec=='about:blank') where='current'; else where='tab'; "
            +"$&"));
    }catch(e){}

})();
 
	/* �󔒃^�u�����݂���ꍇ���p���� */
	function _LoadURL(aTriggeringEvent, aPostData)
	{
		var where = (gBrowser.currentURI.spec!='about:blank' ||
			gBrowser.webProgress.isLoadingDocument) ? 'tab' :'current';
		if (gURLBar.value!='') openUILinkIn(gURLBar.value, where);
		return true;
	}

	/* �^�u���_�u���N���b�N�ŕ��� */
	gBrowser.mTabContainer.addEventListener('dblclick', function (event){
	if (event.target.localName == 'tab' && event.button == 0){
		document.getElementById('cmd_close').doCommand();
		}
	}, false);
