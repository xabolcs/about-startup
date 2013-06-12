const Cc = Components.classes;
const Ci = Components.interfaces;
const Cm = Components.manager;

Cm.QueryInterface(Ci.nsIComponentRegistrar);

const nsIAppStartup = Ci.nsIAppStartup_MOZILLA_2_0 || Ci.nsIAppStartup;

Components.utils.import('resource://gre/modules/XPCOMUtils.jsm');
Components.utils.import('resource://gre/modules/Services.jsm');

/**
 * An XPCOM thing to help redirector about:... pages to an underlying URI.
 */
function AboutRedirector(cid, name, uri) {
  this.cid = cid;
  this.name = name;
  this.uri = Services.io.newURI(uri, null, null);
}

AboutRedirector.prototype = {
  QueryInterface: XPCOMUtils.generateQI([
    Components.interfaces.nsIAboutModule,
    Components.interfaces.nsISupportsWeakReference
  ]),

  register: function register() {
    let registrar = Components.manager.QueryInterface(
      Components.interfaces.nsIComponentRegistrar);
    registrar.registerFactory(
      this.cid, "about:" + this.name,
      "@mozilla.org/network/protocol/about;1?what=" + this.name, this);
  },

  unload: function unload() {
    let registrar = Components.manager.QueryInterface(
      Components.interfaces.nsIComponentRegistrar);
    registrar.unregisterFactory(this.cid, this);
  },

  // nsIAboutModule

  getURIFlags: function getURIFlags(aURI) {
    return 0;
  },

  newChannel: function newChannel(aURI) {
    let channel = Services.io.newChannelFromURI(this.uri);
    channel.originalURI = aURI;
    return channel;
  },

  // nsIFactory

  createInstance: function createInstance(outer, iid) {
    if (outer != null) {
      throw Components.results.NS_ERROR_NO_AGGREGATION;
    }
    return this.QueryInterface(iid);
  }
};

const redirector = new AboutRedirector(
  Components.ID('{ef5c36bf-8559-4449-8133-03e30e83c708}'),
  'startup',
  'chrome://aboutstartup/content/aboutstartup.html'
);

function startup(aData, aReason) {
  redirector.register();
  var fileuri = Services.io.newFileURI(aData.installPath);
  if (!aData.installPath.isDirectory())
    fileuri = Services.io.newURI('jar:' + fileuri.spec + '!/', null, null);
  Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler).setSubstitution('aboutstartup', fileuri);
  Components.utils.import('resource://aboutstartup/patchtbwindow.jsm');
  patchTBWindow.startup({
    menuItem: {label: "about:startup", id: "aboutStartupMenuitem", url: "about:startup"}
  });
  Components.utils.import('resource://aboutstartup/startupdata.jsm');
}

function shutdown(aData, aReason) {
  if (aReason == APP_SHUTDOWN) {
    try {
      StartupData.save();
    } catch(e) {}
  } else {
    Components.utils.import('resource://aboutstartup/patchtbwindow.jsm');
    patchTBWindow.shutdown();
  }
  Services.io.getProtocolHandler('resource').QueryInterface(Ci.nsIResProtocolHandler).setSubstitution('aboutstartup', null);
  redirector.unload();
}
function install(aData, aReason) { }
function uninstall(aData, aReason) { }
