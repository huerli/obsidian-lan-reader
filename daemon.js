const fs=require('fs');const path=require('path');const Plugin=require('./main.js');
const root=fs.realpathSync(process.argv[2]);const config=path.join(root,'.obsidian/plugins/lan-reader/data.json');
function settings(){try{return {...JSON.parse(fs.readFileSync(config,'utf8'))};}catch{return {published:[],port:18081};}}
function files(dir=root){const result=[];for(const entry of fs.readdirSync(dir,{withFileTypes:true})){if(entry.name.startsWith('.')||entry.isSymbolicLink())continue;const full=path.join(dir,entry.name);if(entry.isDirectory())result.push(...files(full));else if(entry.isFile()){const stat=fs.statSync(full);const relative=path.relative(root,full).split(path.sep).join('/');result.push(new TFile(relative,stat));}}return result;}
const {TFile}=require('obsidian');
function local(file){const full=fs.realpathSync(path.join(root,file.path));if(!full.startsWith(root+path.sep))throw Error('文件超出仓库');return full;}
const plugin=new Plugin();plugin.settings={...settings(),port:settings().backgroundPort||settings().port||18081};plugin.app={vault:{getName:()=>path.basename(root),getFiles:()=>files(),cachedRead:async file=>fs.promises.readFile(local(file),'utf8'),readBinary:async file=>fs.promises.readFile(local(file))}};
const handle=plugin.handle.bind(plugin);plugin.handle=async(req,res)=>{plugin.settings={...settings(),port:plugin.settings.port};return handle(req,res);};
(async()=>{await plugin.start();if(!plugin.server?.listening)process.exit(1);console.log('LAN Reader background ready');})();for(const signal of ['SIGTERM','SIGINT'])process.on(signal,async()=>{await plugin.stop();process.exit(0);});
