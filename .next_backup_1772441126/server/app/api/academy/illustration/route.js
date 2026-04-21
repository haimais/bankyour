"use strict";(()=>{var e={};e.id=5625,e.ids=[5625],e.modules={399:e=>{e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},517:e=>{e.exports=require("next/dist/compiled/next-server/app-route.runtime.prod.js")},6005:e=>{e.exports=require("node:crypto")},7919:(e,t,r)=>{r.r(t),r.d(t,{originalPathname:()=>x,patchFetch:()=>y,requestAsyncStorage:()=>p,routeModule:()=>g,serverHooks:()=>f,staticGenerationAsyncStorage:()=>u});var i={};r.r(i),r.d(i,{GET:()=>d,dynamic:()=>c});var a=r(9303),s=r(8716),l=r(670),n=r(6005),o=r.n(n),h=r(7070);let c="force-dynamic";async function d(e){let t=(e.nextUrl.searchParams.get("slug")??"lesson").replace(/[^a-z0-9-_]/gi,"").slice(0,48)||"lesson",r=function(e){let t=o().createHash("sha1").update(e).digest(),r=t[0]%360,i=(r+42+t[1]%50)%360;return{primary:`hsla(${r}, 84%, 56%, 0.9)`,secondary:`hsla(${i}, 80%, 62%, 0.78)`,stroke:`hsla(${(r+12)%360}, 90%, 28%, 0.55)`}}(t),i=t.replace(/[-_]+/g," ").trim().split(/\s+/).slice(0,3).map(e=>e[0]?.toUpperCase()??"").join(""),a=`
<svg xmlns="http://www.w3.org/2000/svg" width="1280" height="720" viewBox="0 0 1280 720">
  <defs>
    <linearGradient id="g1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${r.primary}" />
      <stop offset="100%" stop-color="${r.secondary}" />
    </linearGradient>
    <pattern id="grid" width="42" height="42" patternUnits="userSpaceOnUse">
      <path d="M 42 0 L 0 0 0 42" fill="none" stroke="rgba(255,255,255,0.16)" stroke-width="1"/>
    </pattern>
    <filter id="blur" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
  </defs>

  <rect width="1280" height="720" fill="transparent"/>
  <rect x="36" y="36" width="1208" height="648" rx="46" fill="url(#g1)"/>
  <rect x="36" y="36" width="1208" height="648" rx="46" fill="url(#grid)"/>

  <circle cx="260" cy="230" r="120" fill="rgba(255,255,255,0.26)" filter="url(#blur)" />
  <circle cx="960" cy="490" r="160" fill="rgba(255,255,255,0.2)" filter="url(#blur)" />

  <g transform="translate(148 168)">
    <rect x="0" y="0" width="500" height="250" rx="28" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.35)"/>
    <text x="36" y="70" fill="white" font-family="Inter, Arial, sans-serif" font-size="28" font-weight="600">${t.replace(/-/g," ").slice(0,34)}</text>
    <text x="36" y="122" fill="rgba(255,255,255,0.95)" font-family="Inter, Arial, sans-serif" font-size="62" font-weight="700">${i}</text>
    <rect x="36" y="162" width="210" height="16" rx="8" fill="rgba(255,255,255,0.6)"/>
    <rect x="36" y="192" width="320" height="12" rx="6" fill="rgba(255,255,255,0.46)"/>
  </g>

  <g transform="translate(720 148)">
    <rect x="0" y="0" width="400" height="424" rx="32" fill="rgba(15,23,42,0.22)" stroke="rgba(255,255,255,0.3)"/>
    <rect x="34" y="40" width="332" height="18" rx="9" fill="rgba(255,255,255,0.74)"/>
    <rect x="34" y="78" width="264" height="14" rx="7" fill="rgba(255,255,255,0.54)"/>
    <rect x="34" y="116" width="332" height="126" rx="18" fill="rgba(255,255,255,0.22)"/>
    <rect x="34" y="262" width="332" height="126" rx="18" fill="rgba(255,255,255,0.18)"/>
  </g>
</svg>`.trim();return new h.NextResponse(a,{status:200,headers:{"Content-Type":"image/svg+xml; charset=utf-8","Cache-Control":"public, max-age=86400"}})}let g=new a.AppRouteRouteModule({definition:{kind:s.x.APP_ROUTE,page:"/api/academy/illustration/route",pathname:"/api/academy/illustration",filename:"route",bundlePath:"app/api/academy/illustration/route"},resolvedPagePath:"/Users/haimaisporis/Desktop/bankyour/app/api/academy/illustration/route.ts",nextConfigOutput:"",userland:i}),{requestAsyncStorage:p,staticGenerationAsyncStorage:u,serverHooks:f}=g,x="/api/academy/illustration/route";function y(){return(0,l.patchFetch)({serverHooks:f,staticGenerationAsyncStorage:u})}}};var t=require("../../../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),i=t.X(0,[9380,5972],()=>r(7919));module.exports=i})();