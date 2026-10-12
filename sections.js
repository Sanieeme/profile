/* =========================================================
   CASE-FILE DEMOS — sample quiz, pandas clean-up, request tracer,
   and the scroll-progress bar. Ported from Sanieeme.html.
========================================================= */

(function () {
    "use strict";
    var root = document.documentElement;

/* ---------- sample quiz ---------- */
  var QS=[
    {q:'Which HTTP status code means "Not Found"?',a:['200','404','500','301'],c:1},
    {q:'Which SQL clause filters rows after GROUP BY?',a:['WHERE','HAVING','ORDER BY','LIMIT'],c:1},
    {q:'Which command creates a branch and switches to it?',a:['git checkout -b','git branch -d','git merge','git stash'],c:0}
  ];
  var SECS=15,qi=0,score=0,locked=false,tick=null,quiz=document.getElementById('quiz');
  function shuffle(a){a=a.slice();for(var i=a.length-1;i>0;i--){var j=Math.floor(Math.random()*(i+1));var t=a[i];a[i]=a[j];a[j]=t;}return a;}
  function lock(){locked=true;clearInterval(tick);quiz.querySelectorAll('.q-opt').forEach(function(b){b.disabled=true;if(b.dataset.ok==='1')b.classList.add('ok');});}
  function advance(){setTimeout(function(){qi++;qi<QS.length?ask():finish();},1200);}
  function ask(){
    var it=QS[qi],opts=shuffle(it.a.map(function(t,k){return{t:t,ok:k===it.c};}));
    locked=false;
    quiz.innerHTML='<div class="q-meta"><span>Sample round</span><span>Question '+(qi+1)+' of '+QS.length+'</span></div>'
      +'<div class="q-prog">'+QS.map(function(_,k){return'<i class="'+(k<qi?'done':k===qi?'now':'')+'"></i>';}).join('')+'</div>'
      +'<p class="q-text">'+it.q+'</p>'
      +'<div class="q-opts">'+opts.map(function(o){return'<button type="button" class="q-opt" data-ok="'+(o.ok?1:0)+'">'+o.t+'</button>';}).join('')+'</div>'
      +'<div class="q-timer"><b id="qbar"></b></div><p class="q-foot" id="qfoot">'+SECS+' seconds per question. Options shuffle every round.</p>';
    var left=SECS,bar=document.getElementById('qbar'),foot=document.getElementById('qfoot');
    quiz.querySelectorAll('.q-opt').forEach(function(b){
      b.addEventListener('click',function(){
        if(locked)return;lock();
        if(b.dataset.ok==='1'){score++;foot.textContent='Correct.';}
        else{b.classList.add('no');foot.textContent='Not quite. The right answer is highlighted.';}
        advance();
      });
    });
    clearInterval(tick);
    tick=setInterval(function(){
      left-=0.1;bar.style.width=Math.max(0,left/SECS*100)+'%';
      if(left<=0&&!locked){lock();foot.textContent='Time is up.';advance();}
    },100);
  }
  function finish(){
    quiz.innerHTML='<div class="q-end"><p class="eyebrow">Round complete</p><div class="score">'+score+' / '+QS.length+'</div><p>'+(score===QS.length?'A clean sweep.':'Good run. Shuffle the options and go again.')+'</p><button class="btn-sm" type="button" id="again">Play again</button></div>';
    document.getElementById('again').addEventListener('click',function(){qi=0;score=0;ask();});
  }
  ask();

  /* ---------- sample pipeline ---------- */
  var RAW=[[' btc ','$67,420.5','21.4C'],['ETH','3,512','NaN'],['btc','67420.5','21.4'],['eth ','3512.0','22.0C']];
  var CLEAN=[['BTC','67420.50','21.4'],['ETH','3512.00','22.0']];
  var cleaned=false,pb=document.getElementById('pipeBody'),pn=document.getElementById('pipeNote'),pc=document.getElementById('pipeCode'),pbtn=document.getElementById('pipeBtn');
  function pipe(){
    if(cleaned){
      pb.innerHTML=CLEAN.map(function(r){return'<tr>'+r.map(function(v){return'<td>'+v+'</td>';}).join('')+'</tr>';}).join('');
      pc.textContent='df["coin"] = df["coin"].str.strip().str.upper()\ndf["price_usd"] = df["price_usd"].str.replace("[$,]", "", regex=True).astype(float)\ndf["temp_c"] = pd.to_numeric(df["temp_c"].str.rstrip("C"), errors="coerce")\ndf = df.groupby("coin", as_index=False).first()';
      pn.textContent='2 rows · one per coin · numeric columns';pbtn.textContent='Reset';
    }else{
      pb.innerHTML=RAW.map(function(r){return'<tr>'+r.map(function(v){return'<td'+(v==='NaN'?' class="bad"':'')+'>"'+v+'"</td>';}).join('')+'</tr>';}).join('');
      pc.textContent='df = pd.DataFrame(rows)';
      pn.textContent='4 rows · mixed formats · duplicates · missing value';pbtn.textContent='Run clean';
    }
  }
  pbtn.addEventListener('click',function(){cleaned=!cleaned;pipe();});
  pipe();

  /* ---------- request tracer ---------- */
  var EP={
    'GET /quizzes':{status:200,
      sql:'SELECT id, title\nFROM quizzes\nORDER BY title;',
      res:'{\n  "status": 200,\n  "data": [\n    {"id": 1, "title": "HTTP basics"},\n    {"id": 2, "title": "SQL essentials"}\n  ]\n}',
      log:['Client sends GET /quizzes','Route finds the list handler','Validate confirms the session is signed in','Query reads quizzes ordered by title','Respond returns 200 with a JSON list']},
    'POST /results':{status:201,
      sql:'INSERT INTO results (user_id, quiz_id, score)\nVALUES (?, ?, ?);',
      res:'{\n  "status": 201,\n  "data": {"id": 41, "quiz_id": 2, "score": 8}\n}',
      log:['Client sends POST /results with a JSON body','Route finds the create handler','Validate checks quiz_id and score are present and numeric','Query inserts one row using bound parameters','Respond returns 201 Created']},
    'GET /quizzes/99':{status:404,
      sql:'SELECT id, title\nFROM quizzes\nWHERE id = ?;\n-- 0 rows',
      res:'{\n  "status": 404,\n  "error": "quiz not found"\n}',
      log:['Client sends GET /quizzes/99','Route finds the detail handler','Validate confirms 99 is a valid integer','Query finds no matching row','Respond returns 404 with a clear error message']}
  };
  var tCur='GET /quizzes',tTimer=null,reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hops=document.querySelectorAll('#hops li'),tlog=document.getElementById('traceLog'),sqlO=document.getElementById('sqlOut'),resO=document.getElementById('resOut'),pill=document.getElementById('statusPill');
  function lines(n){return EP[tCur].log.slice(0,n).map(function(l){return'→ '+l;}).join('\n');}
  function fillOut(){var e=EP[tCur];sqlO.textContent=e.sql;resO.textContent=e.res;pill.textContent=e.status;pill.className='pill '+(e.status>=400?'err':'ok');}
  function allDone(){hops.forEach(function(h){h.className='done';});tlog.textContent=lines(5);fillOut();}
  function play(){
    clearTimeout(tTimer);
    var d=reduce?0:520,i=0;
    hops.forEach(function(h){h.className='';});
    tlog.textContent='';sqlO.textContent='…';resO.textContent='…';pill.textContent='';pill.className='pill';
    (function step(){
      if(i>=5){allDone();return;}
      hops.forEach(function(h,k){h.className=k<i?'done':k===i?'on':'';});
      tlog.textContent=lines(i+1);
      i++;tTimer=setTimeout(step,d);
    })();
  }
  document.querySelectorAll('.seg-b').forEach(function(b){
    b.addEventListener('click',function(){
      tCur=b.dataset.k;
      document.querySelectorAll('.seg-b').forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false');});
      play();
    });
  });
  document.getElementById('replay').addEventListener('click',play);
  allDone();

  /* ---------- scroll progress ---------- */
  var prog=document.getElementById('prog');
  function onScroll(){
    var h=root.scrollHeight-root.clientHeight;
    prog.style.width=(h>0?Math.min(100,window.pageYOffset/h*100):0)+'%';
  }
  addEventListener('scroll',onScroll,{passive:true});
  addEventListener('resize',onScroll);
  onScroll();
})();
