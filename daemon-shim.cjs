class TFile{constructor(path,stat){this.path=path;this.basename=path.split('/').pop().replace(/\.[^.]+$/,'');this.extension=path.split('.').pop().toLowerCase();this.stat={mtime:stat.mtimeMs};}}
module.exports={Plugin:class{},PluginSettingTab:class{},Setting:class{},TFile,Notice:class{constructor(message){console.log(message);}}};
