const path = require('path').posix;
const MarkdownIt = require('markdown-it');
const sanitizeHtml=require('sanitize-html');
function allowed(p, scope) { return !!p && !p.split('/').some(x => x.startsWith('.') || x === '..') && (!scope || p.startsWith(scope + '/')); }
function resolve(target, source, files) {
  target = target.replace(/\\/g, '/');
  const hash = target.indexOf('#'); const anchor = hash < 0 ? '' : target.slice(hash);
  target = hash < 0 ? target : target.slice(0, hash);
  if (!target) return {path:source, anchor};
  const relative = path.normalize(path.join(path.dirname(source), target));
  const candidates = [relative, relative + '.md', target, target + '.md'];
  const found = candidates.find(p => files.some(f => f.path === p));
  const matches = files.filter(f => f.path === target || f.path.split('/').pop() === target || f.path.split('/').pop() === target + '.md');
  return {path:found || (matches.length === 1 ? matches[0].path : ''), anchor};
}
function render(text, source, files) {
 const md = new MarkdownIt({html:true, linkify:true, typographer:true});
 const validate=md.validateLink.bind(md);md.validateLink=url=>/^data:image\/(?:png|jpeg|gif|webp|avif);base64,[a-z0-9+/=]+$/i.test(url)||validate(url);
 md.inline.ruler.before('html_inline','safe_comment',(state,silent)=>{const m=/^<!--[\s\S]*?-->/.exec(state.src.slice(state.pos));if(!m)return false;state.pos+=m[0].length;return true;});
 const href = t => { const r = resolve(t, source, files); return r.path ? '/?note=' + encodeURIComponent(r.path) + r.anchor : '#'; };
 md.inline.ruler.before('html_inline', 'safe_break', (state, silent) => { const m = /^<br\s*\/?\s*>/i.exec(state.src.slice(state.pos)); if (!m) return false; if (!silent) state.push('hardbreak', 'br', 0); state.pos += m[0].length; return true; });
 md.inline.ruler.before('image', 'wiki', (state, silent) => {
  const m = /^(!?)\[\[([^\]\n]+)\]\]/.exec(state.src.slice(state.pos)); if (!m) return false;
  if (!silent) { const [target, alias] = m[2].split('|'); const r = resolve(target, source, files); const image = m[1] && /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(r.path);
   if (image) { const token = state.push('image','img',0); token.attrs=[['src','/asset?path='+encodeURIComponent(r.path)],['alt',alias || target]]; token.children=[]; }
   else { const token=state.push('link_open','a',1); token.attrs=[['href',href(target)]]; const txt=state.push('text','',0); txt.content=alias || target; state.push('link_close','a',-1); }
  } state.pos += m[0].length; return true;
 });
 const link = md.renderer.rules.link_open || ((tokens,i,opts,env,self)=>self.renderToken(tokens,i,opts));
 md.renderer.rules.link_open=(tokens,i,opts,env,self)=>{ const t=tokens[i], h=t.attrGet('href'); if(h && !/^(?:[a-z][\w+.-]*:|\/\?|#)/i.test(h)) t.attrSet('href',href(decode(h))); return link(tokens,i,opts,env,self); };
 const img=md.renderer.rules.image;
 md.renderer.rules.image=(tokens,i,opts,env,self)=>{const t=tokens[i], src=t.attrGet('src'); if(src && !src.startsWith('/asset?')) { if (/^(?:https:\/\/|data:image\/(?:png|jpeg|gif|webp|avif);base64,)/i.test(src)) {} else if (/^[a-z][\w+.-]*:/i.test(src)) t.attrSet('src',''); else {const r=resolve(decode(src),source,files);t.attrSet('src',r.path?'/asset?path='+encodeURIComponent(r.path):'');}} return img(tokens,i,opts,env,self);};
 md.core.ruler.push('headings', state=>{let count=0; for(const t of state.tokens) if(t.type==='heading_open')t.attrSet('id','section-'+ ++count);});
 return sanitizeHtml(md.render(text.replace(/^---\r?\n[\s\S]*?\r?\n---(?:\r?\n|$)/,'')),{
 allowedTags:[...sanitizeHtml.defaults.allowedTags,'img','font','details','summary','mark','sup','sub','kbd','s','del','input'],
 allowedAttributes:{'*':['style','class','id','title','align'],a:['href','name','target','rel'],img:['src','alt','width','height'],font:['color','face','size'],td:['colspan','rowspan'],th:['colspan','rowspan','scope'],ol:['start'],input:['type','checked','disabled'],details:['open']},
 allowedSchemes:['http','https','mailto'],allowedSchemesByTag:{img:['https','data']},allowProtocolRelative:false,
 allowedStyles:{'*':{
 'color':[/^(?:#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\)|[a-z]+)$/i],
 'background-color':[/^(?:#[0-9a-f]{3,8}|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\)|[a-z]+)$/i],
 'font-size':[/^\d+(?:\.\d+)?(?:px|em|rem|%)$/], 'font-weight':[/^(?:normal|bold|bolder|lighter|[1-9]00)$/],
 'font-style':[/^(?:normal|italic|oblique)$/], 'text-align':[/^(?:left|right|center|justify|start|end)$/],
 'text-decoration':[/^(?:none|underline|line-through|overline)(?:\s+(?:underline|line-through|overline))*$/],
 'white-space':[/^(?:normal|pre|pre-wrap|pre-line|nowrap|break-spaces)$/],
 'width':[/^(?:auto|\d+(?:\.\d+)?(?:px|em|rem|%))$/], 'max-width':[/^(?:none|\d+(?:\.\d+)?(?:px|em|rem|%))$/],
 'height':[/^(?:auto|\d+(?:\.\d+)?(?:px|em|rem|%))$/], 'line-height':[/^\d+(?:\.\d+)?(?:px|em|rem|%)?$/],
 'vertical-align':[/^(?:top|middle|bottom|baseline|sub|super)$/]
 }},transformTags:{input:(tagName,attribs)=>({tagName,attribs:{type:'checkbox',disabled:'',...(Object.hasOwn(attribs,'checked')?{checked:''}:{})}})}
 });
}
function decode(s){try{return decodeURIComponent(s);}catch{return s;}}
const imageTypes={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',gif:'image/gif',webp:'image/webp',avif:'image/avif',svg:'image/svg+xml'};
async function inlineImages(html,files,read){const matches=[...html.matchAll(/src="\/asset\?path=([^"\s]+)"/g)];for(const m of matches){const file=files.find(f=>f.path===decode(m[1]));const mime=file&&imageTypes[file.extension?.toLowerCase()];if(!mime)continue;try{const data=Buffer.from(await read(file));html=html.replaceAll(m[0],'src="data:'+mime+';base64,'+data.toString('base64')+'"');}catch{}}return html;}
async function convertImages(text,source,files,read,remote){let count=0;const failures=[];const pattern=/(```[\s\S]*?```|~~~[\s\S]*?~~~|`+[^`\n]*`+)|!\[\[([^\]\n]+)\]\]|!\[([^\]\n]*)\]\((<[^>]+>|[^\s)]+>?)\)/g;let result='',last=0;for(const m of text.matchAll(pattern)){result+=text.slice(last,m.index);last=m.index+m[0].length;if(m[1]){result+=m[0];continue;}const target=m[2]?m[2].split('|')[0]:m[4].replace(/^<|>$/g,'');if(/^[a-z][\w+.-]*:/i.test(target)){if(remote&&/^https:\/\//i.test(target)){try{const image=await remote(target);result+='!['+(m[3]||'图片').replace(/[\[\]\n]/g,'')+'](data:'+image.mime+';base64,'+image.data.toString('base64')+')';count++;}catch(e){failures.push({url:target,error:e.message});result+=m[0];}}else result+=m[0];continue;}const r=resolve(decode(target),source,files);const file=files.find(f=>f.path===r.path);const mime=file&&imageTypes[file.extension?.toLowerCase()];if(!mime||mime==='image/svg+xml'){result+=m[0];continue;}const data=Buffer.from(await read(file));const alt=(m[3]||'图片').replace(/[\[\]\n]/g,'');result+='!['+alt+'](data:'+mime+';base64,'+data.toString('base64')+')';count++;}return {text:result+text.slice(last),count,failures};}
module.exports={allowed,resolve,render,inlineImages,convertImages};
