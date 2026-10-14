const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["./pdf-Bw8iuiNU.js","./pdf-Bar355oX.js","./preload-helper-uBIymjUX.js","./pdf.worker.min-7-AH9Bqm.js","./pdf.worker.min-DUYTeoJa.js"])))=>i.map(i=>d[i]);
import{t as e}from"./preload-helper-uBIymjUX.js";var t=3e4;async function n(t){let[n,{default:i}]=await Promise.all([e(()=>import(`./pdf-Bw8iuiNU.js`),__vite__mapDeps([0,1,2]),import.meta.url),e(()=>import(`./pdf.worker.min-7-AH9Bqm.js`),__vite__mapDeps([3,4]),import.meta.url)]);n.GlobalWorkerOptions.workerSrc=i;let a=n.getDocument({data:await t.arrayBuffer()});try{return await r(await a.promise)}finally{await a.destroy()}}async function r(e){let n=[],r=0;for(let i=1;i<=e.numPages&&r<t;i++){let{items:t}=await(await e.getPage(i)).getTextContent(),a=t.map(e=>(e.str??``)+(e.hasEOL?`
`:` `)).join(``).replace(/[ \t]+/g,` `).replace(/\n{3,}/g,`

`).trim();a&&(n.push(a),r+=a.length)}return n.join(`

`).slice(0,t)}export{n as t};