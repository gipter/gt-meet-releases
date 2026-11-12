/* GT-Meet 사용 설명서 (프로그램 내장, 4개 언어) */
window.HELP = {};

HELP.ko = `
<h2>1. 시작하기</h2>
<p>GT-Meet는 팀 화상회의 프로그램입니다. 영상·음성·파일은 참가자끼리 직접 주고받고 서버에 저장되지 않습니다.</p>
<ul>
<li><b>PC 앱:</b> 설치 파일(GT-Meet-Setup)을 실행해 설치한 뒤 바탕화면의 <b>GT-Meet</b> 아이콘으로 실행합니다. 처음에 "Windows의 PC 보호" 창이 뜨면 <b>추가 정보 → 실행</b>을 누르세요.</li>
<li><b>설치 없이:</b> 프로그램 폴더의 <b>GT-Meet.vbs</b>를 더블클릭합니다(Node.js 필요).</li>
<li><b>초대받은 사람:</b> 받은 초대 링크를 누르면 Chrome·Edge에서 바로 참여 화면이 열립니다. 설치할 것이 없습니다.</li>
</ul>
<p>처음 화면 오른쪽 위에서 <b>언어</b>를 바꿀 수 있고, <b>⚙ 설정</b>에서 카메라·마이크·배경을 미리 정할 수 있습니다. 설정은 자동 저장되어 다음 실행 때 그대로 적용됩니다.</p>

<h2>2. 회의 열기 (호스트)</h2>
<ol>
<li>이름을 입력하고 <b>새 회의 시작</b>을 누릅니다.</li>
<li>회의 ID(9자리)와 비밀번호(6자리)가 자동으로 만들어지고 <b>회의 정보</b> 창이 뜹니다.</li>
<li><b>✉ 초대문 복사</b>를 눌러 메신저나 메일에 붙여 넣어 보냅니다. 초대문에는 바로 참여 링크와 ID·비밀번호가 들어 있습니다.</li>
<li>누군가 들어오려 하면 화면 위에 <b>입장 요청</b> 알림이 뜹니다. <b>수락</b> 또는 <b>거절</b>을 누르세요. 여러 명이면 <b>모두 수락</b>도 됩니다.</li>
</ol>
<div class="tip">회의 정보 창은 상단의 <b>ID ○○○ ○○○ ○○○</b> 버튼이나 <b>✉ 초대하기</b>로 언제든 다시 열 수 있습니다.</div>

<h2>3. 회의 참여</h2>
<ul>
<li><b>링크를 받은 경우:</b> 링크를 누르면 ID와 비밀번호가 채워져 있습니다. 이름만 넣고 <b>참여 요청</b>을 누르세요.</li>
<li><b>ID·비밀번호만 받은 경우:</b> <b>회의 참여</b>를 누르고 입력한 뒤 <b>참여 요청</b>을 누릅니다.</li>
<li><b>PC 앱으로 다른 사람의 회의에 참여:</b> <b>회의 참여</b>의 회의 ID 칸에 받은 <b>초대 링크를 통째로 붙여 넣으면</b> 회의 주소·ID·비밀번호가 자동으로 채워집니다.</li>
<li>호스트가 수락하면 자동으로 회의에 들어갑니다. 기다리는 동안 <b>요청 취소</b>로 그만둘 수 있습니다.</li>
</ul>
<div class="warn">비밀번호나 회의 ID를 10분 안에 8번 틀리면 10분 동안 참여가 막힙니다.</div>

<h2>4. 호스트 기능</h2>
<ul>
<li><b>대기실 사용:</b> 끄면 비밀번호만 맞으면 바로 입장합니다.</li>
<li><b>회의 잠금:</b> 새 참가자를 막습니다. 잠기면 상단에 🔒 표시가 나옵니다.</li>
<li><b>참가자 탭:</b> 참가자별로 <b>호스트 넘기기</b>, <b>내보내기</b>를 할 수 있습니다.</li>
<li><b>나가기:</b> <b>모두에게 회의 종료</b> 또는 <b>나만 나가기</b>를 고릅니다. 나만 나가면 가장 먼저 들어온 참가자가 호스트를 이어받습니다.</li>
</ul>

<h2>5. 회의 중 기능</h2>
<table>
<tr><th>버튼</th><th>기능</th></tr>
<tr><td>마이크 / 카메라</td><td>켜고 끕니다. 꺼지면 아이콘에 빨간 X가 표시되고, 상대 화면과 참가자 목록에도 같은 표시가 나옵니다.</td></tr>
<tr><td>화면공유</td><td>모니터 전체나 특정 창을 공유합니다. 공유 화면이 크게 표시됩니다.</td></tr>
<tr><td>채팅</td><td>오른쪽 패널에서 메시지를 보냅니다. Enter 전송, Shift+Enter 줄바꿈.</td></tr>
<tr><td>파일 보내기</td><td>📎 버튼이나 채팅창으로 끌어다 놓기. 참가자에게 직접 전송되며 파일당 1GB까지입니다. 받은 파일은 보낸 사람을 확인하고 여세요.</td></tr>
<tr><td>중요 표시 📌</td><td>지금 순간을 모든 참가자 화면에서 동시에 캡처하고 메모를 남깁니다.</td></tr>
</table>
<p>타일을 더블클릭하면 전체 화면으로 볼 수 있습니다. 말하는 사람은 초록 테두리로 표시됩니다.</p>

<h2>6. 녹화 · 녹취록 · 자동 캡처 · 회의록</h2>
<h3>녹화</h3>
<p><b>⏺ 녹화</b>를 누르면 모든 참가자 화면과 음성을 합쳐 녹화합니다. 녹화 중에는 모든 참가자에게 <b>● 녹화 중</b>이 표시됩니다. 녹화 전에 참가자의 동의를 받으세요. 파일은 이 PC에만 저장됩니다(PC 앱은 <b>다운로드\\GT-Meet</b> 폴더).</p>
<h3>녹취록</h3>
<p><b>✎ 녹취</b>를 켜면 내 목소리가 글자로 바뀌어 모든 참가자에게 자막과 녹취록으로 공유됩니다. 녹취를 켠 사람의 발언만 기록되므로 필요한 사람 모두 켜 주세요. 인식 언어는 녹취록 탭이나 설정에서 바꿉니다.</p>
<div class="warn">녹취는 Chrome·Edge에서 동작하며, 브라우저에 따라 음성이 브라우저 제조사 서버로 전송될 수 있습니다. PC 앱에서는 녹취가 동작하지 않으므로, 브라우저로 참여한 참가자가 녹취를 켜면 모두에게 공유됩니다.</div>
<h3>중요 시점 자동 캡처</h3>
<p>화면공유 시작, 공유 화면 전환(슬라이드 넘김), "중요·결정·확정·마감·액션아이템" 같은 핵심어가 말이나 채팅에 나올 때, 📌를 누를 때 자동으로 캡처합니다. 캡처 탭에서 확인하고, 이미지를 오른쪽 클릭하면 저장됩니다.</p>
<h3>회의록</h3>
<p><b>📝 회의록</b>을 누르면 일시·참석자·핵심 발언·캡처·전체 녹취록·채팅이 담긴 문서(HTML)가 저장됩니다. 브라우저에서 열어 요약을 적고 <b>인쇄 → PDF로 저장</b>할 수 있습니다.</p>

<h2>7. 설정</h2>
<ul>
<li><b>장치:</b> 사용할 카메라·마이크, 그리고 켜고 시작할지 정합니다.</li>
<li><b>카메라 배경:</b> 그대로 / 배경 흐림 / 배경 바꾸기(기본 그림 4종 또는 내 사진). 사람과 배경은 이 PC 안에서 구분하며 영상이 외부로 나가지 않습니다. 처음 한 번은 준비에 몇 초 걸립니다. PC에서는 그래픽카드로 머리카락 경계까지 더 정교하게 구분하고 뒤의 의자·침대 같은 물건도 지웁니다(⚙ 설정 → <b>고품질 배경 처리</b>, 기본 켜짐). 그래픽카드가 느리거나 없으면 자동으로 기본 방식을 씁니다. 휴대폰은 기본 방식입니다. <b>배경 흐림은 방을 흐리게 보여 줄 뿐 가려 주지 않습니다.</b> 가상 배경도 움직일 때 사람 둘레로 방이 아주 조금씩 비칠 수 있으므로(연구로 알려진 한계), 방을 확실히 숨겨야 하면 ⚙ 설정의 <b>개인정보 보호 강화</b>를 켜고, 중요한 회의는 정돈된 자리에서 하세요. 배경 효과가 멈추면 원래 화면 대신 카메라 꺼짐 그림을 보냅니다.</li>
<li><b>카메라를 껐을 때 보여줄 그림:</b> 카메라를 끄면 검은 화면 대신 이 그림이 상대에게 보입니다.</li>
<li><b>언어 · 녹취 언어 · 자동 캡처 · 외부 접속 자동 켜기.</b></li>
</ul>
<p>모든 설정은 바꾸는 즉시 저장되며 회의 중에도 <b>⚙ 설정</b>으로 바꿀 수 있습니다.</p>

<h2>8. 원격지 참석자 (외부 접속)</h2>
<p>다른 건물·다른 도시처럼 인터넷 어디서나 참여하려면 처음 화면의 <b>🌐 외부 접속 [켜기]</b>를 누릅니다. 인터넷 주소가 자동으로 만들어지고(공유기 설정 불필요), 이후 복사하는 초대문에 그 주소가 들어갑니다.</p>
<ul>
<li>주소는 프로그램을 켤 때마다 바뀌므로 <b>링크가 들어 있는 초대문</b>을 보내세요.</li>
<li>외부에서 들어온 사람은 참여만 할 수 있고, 회의는 이 PC에서만 열 수 있습니다.</li>
<li>방화벽이 매우 엄격한 회사·기관망에서는 영상 연결이 안 될 수 있습니다.</li>
</ul>

<h2>9. 업데이트</h2>
<p>PC 앱은 <b>하루에 처음 실행할 때</b> 새 버전이 있는지 확인합니다(켜 둔 채 날짜가 바뀌면 다음 날 처음 쓸 때 확인).</p>
<ol>
<li>새 버전이 있으면 <b>"지금 업데이트할까요?"</b>라고 묻습니다. 회의 중이면 회의가 끝난 뒤에 묻습니다.</li>
<li><b>지금 업데이트</b>를 누르면 내려받아 설치하고 프로그램이 다시 시작됩니다.</li>
<li><b>나중에</b>를 누르면 첫 화면과 <b>⚙ 설정 → 프로그램 정보</b>에 안내가 남고, 언제든 <b>지금 업데이트</b>로 진행할 수 있습니다. 다음 날 처음 실행할 때 다시 묻습니다.</li>
</ol>
<div class="warn"><b>필수 업데이트:</b> 회의 방식이 바뀌어 이전 버전과 함께 쓸 수 없는 업데이트는 "필수"로 표시됩니다. 업데이트하지 않으면 새 버전 사용자와 <b>회의를 만들거나 참여할 수 없으며</b>, 그때 회의 화면에 업데이트 안내가 나옵니다.</div>

<h2>10. 단축키</h2>
<table>
<tr><td><kbd>M</kbd></td><td>마이크 켜기/끄기</td></tr>
<tr><td><kbd>V</kbd></td><td>카메라 켜기/끄기</td></tr>
<tr><td><kbd>B</kbd></td><td>중요 표시(📌)</td></tr>
<tr><td><kbd>F1</kbd></td><td>사용 설명서</td></tr>
<tr><td><kbd>F11</kbd></td><td>전체 화면 (PC 앱)</td></tr>
</table>

<h2>11. 문제 해결</h2>
<ul>
<li><b>카메라·마이크가 안 됨:</b> 다른 프로그램(Zoom, Teams 등)이 사용 중인지 확인하고, 설정에서 장치를 다시 고르세요. 브라우저라면 주소창 왼쪽 자물쇠에서 권한을 허용합니다.</li>
<li><b>상대 영상이 "연결 중…"에서 멈춤:</b> 회사 방화벽 때문일 수 있습니다. 다른 네트워크(휴대폰 핫스팟 등)로 시험해 보세요.</li>
<li><b>회의를 찾을 수 없음:</b> 회의 ID를 확인하고, 호스트가 회의를 시작했는지 확인하세요. 회의가 끝나면 ID는 다시 쓸 수 없습니다.</li>
<li><b>배경 효과가 안 됨:</b> 처음 한 번은 인터넷에서 모델 파일을 받아야 합니다. 인터넷 연결을 확인하세요.</li>
<li><b>녹화 파일이 저장되지 않음:</b> 채팅창의 <b>⬇ 녹화 파일 저장</b> 버튼을 누르세요.</li>
</ul>

<h2>12. 개인정보 · 보안</h2>
<ul>
<li>영상·음성·파일은 참가자끼리 암호화되어 직접 오가며 서버에 저장되지 않습니다.</li>
<li>녹화·녹취록·캡처·회의록은 각자의 PC에만 저장됩니다.</li>
<li>설정(배경 사진, 꺼짐 그림 포함)은 이 PC에만 보관됩니다.</li>
<li>초대 링크에는 비밀번호가 들어 있으니 필요한 사람에게만 보내세요.</li>
</ul>

<h2>13. 휴대폰 · 태블릿</h2>
<h3>안드로이드 앱</h3>
<ol>
<li><b>설치:</b> 설치 파일(GT-Meet-Android-○○.apk)을 휴대폰에서 내려받아 엽니다. "출처를 알 수 없는 앱" 안내가 나오면 해당 앱(내 파일·Chrome 등)에서 <b>이 출처 허용</b>을 켭니다.</li>
<li><b>처음 실행:</b> 카메라·마이크·알림 권한을 <b>허용</b>합니다.</li>
<li><b>참여:</b> 메신저에서 받은 초대문을 길게 눌러 <b>공유 → GT-Meet</b>를 고르면 회의 정보가 채워집니다. 또는 초대문을 복사한 뒤 앱의 <b>📋 초대문 붙여넣기</b>를 누르세요. 이름을 넣고 <b>참여 요청</b>을 누르면 됩니다.</li>
</ol>
<ul>
<li>회의 중에 다른 앱으로 가도 통화가 유지되고, 상단에 "회의 중" 알림이 보입니다. 누르면 회의로 돌아옵니다.</li>
<li>소리는 스피커로 나옵니다(이어폰·블루투스가 연결돼 있으면 그쪽).</li>
<li>녹화·회의록·받은 파일은 <b>다운로드/GT-Meet</b> 폴더에 저장됩니다.</li>
<li>회의 정보 창의 <b>📤 공유</b>로 초대문을 메신저에 바로 보낼 수 있습니다.</li>
<li>업데이트: 하루에 처음 실행할 때 확인해 새 버전이 있으면 묻습니다. <b>지금 업데이트</b>를 누르면 설치 파일을 내려받으니 열어서 설치하세요(설정은 유지됩니다).</li>
</ul>
<h3>아이폰 · 아이패드</h3>
<ul>
<li>받은 초대 링크를 누르면 Safari에서 바로 참여 화면이 열립니다. 설치할 것이 없습니다.</li>
<li>자주 쓴다면 Safari로 <b>gipter.github.io/gt-meet-releases</b> 를 열고 공유 버튼(□↑) → <b>홈 화면에 추가</b>를 누르세요. 그 아이콘으로 열어 <b>📋 초대문 붙여넣기</b>로 참여합니다. 새 버전은 자동으로 반영됩니다.</li>
</ul>
<h3>휴대폰에서 안 되는 것</h3>
<ul>
<li><b>회의 만들기</b>는 PC에서 합니다(휴대폰은 참여 전용).</li>
<li><b>화면 공유</b>는 휴대폰에서 지원되지 않습니다. 다른 사람이 공유한 화면은 볼 수 있습니다.</li>
<li><b>녹취</b>는 안드로이드 앱에서 지원되지 않습니다. 휴대폰 Chrome이나 아이폰 Safari로 초대 링크를 열어 참여하면 켤 수 있습니다.</li>
<li>배경 효과는 기기 성능에 따라 느릴 수 있습니다. 느리면 설정에서 "그대로"로 바꾸세요.</li>
</ul>
<div class="tip">화면 위 <b>☰</b> 버튼으로 채팅·녹취록·캡처·참가자 패널을 열고, ✕로 닫습니다. ☰에 빨간 점이 보이면 새 채팅이 온 것입니다. 가로·세로 화면 모두 지원합니다.</div>
`;

HELP.en = `
<h2>1. Getting started</h2>
<p>GT-Meet is a video meeting app for teams. Video, audio and files go directly between participants and are never stored on the server.</p>
<ul>
<li><b>Desktop app:</b> run the installer (GT-Meet-Setup), then launch <b>GT-Meet</b> from the desktop. If "Windows protected your PC" appears, click <b>More info → Run anyway</b>.</li>
<li><b>Without installing:</b> double-click <b>GT-Meet.vbs</b> in the program folder (requires Node.js).</li>
<li><b>Invited guests:</b> just open the invite link in Chrome or Edge — nothing to install.</li>
</ul>
<p>Change the <b>language</b> at the top right of the start screen, and set your camera, microphone and background in <b>⚙ Settings</b>. Settings are saved automatically and applied next time.</p>

<h2>2. Starting a meeting (host)</h2>
<ol>
<li>Enter your name and click <b>New meeting</b>.</li>
<li>A meeting ID (9 digits) and password (6 digits) are created and the <b>Meeting info</b> window opens.</li>
<li>Click <b>✉ Copy invitation</b> and paste it into a messenger or email. It contains a direct join link plus the ID and password.</li>
<li>When someone asks to join, a <b>Join request</b> appears at the top. Click <b>Admit</b> or <b>Deny</b>, or <b>Admit all</b> for several people.</li>
</ol>
<div class="tip">Reopen the meeting info any time with the <b>ID ○○○ ○○○ ○○○</b> button or <b>✉ Invite</b> at the top.</div>

<h2>3. Joining a meeting</h2>
<ul>
<li><b>With a link:</b> the ID and password are filled in. Enter your name and click <b>Ask to join</b>.</li>
<li><b>With ID and password only:</b> click <b>Join meeting</b>, enter them and click <b>Ask to join</b>.</li>
<li><b>Joining someone else’s meeting from the desktop app:</b> paste the whole <b>invite link</b> into the meeting ID field — the meeting address, ID and password are filled in automatically.</li>
<li>You enter automatically once the host admits you. Click <b>Cancel request</b> to stop waiting.</li>
</ul>
<div class="warn">After 8 wrong passwords or meeting IDs within 10 minutes, joining is blocked for 10 minutes.</div>

<h2>4. Host controls</h2>
<ul>
<li><b>Waiting room:</b> turn it off to let anyone with the password in directly.</li>
<li><b>Lock meeting:</b> blocks new participants; 🔒 appears at the top.</li>
<li><b>Participants tab:</b> <b>Make host</b> or <b>Remove</b> for each person.</li>
<li><b>Leave:</b> choose <b>End meeting for all</b> or <b>Leave only me</b> — the earliest participant becomes host.</li>
</ul>

<h2>5. During a meeting</h2>
<table>
<tr><th>Button</th><th>What it does</th></tr>
<tr><td>Mic / Camera</td><td>Turn on/off. When off, the icon shows a red X — also on others’ screens and in the participant list.</td></tr>
<tr><td>Share</td><td>Share a whole monitor or a single window. The shared screen is shown large.</td></tr>
<tr><td>Chat</td><td>Send messages in the right panel. Enter sends, Shift+Enter adds a line.</td></tr>
<tr><td>Send file</td><td>📎 button or drag into the chat. Sent directly, up to 1 GB per file. Check the sender before opening received files.</td></tr>
<tr><td>Mark 📌</td><td>Captures this moment on every participant’s screen at once, with an optional note.</td></tr>
</table>
<p>Double-click a tile for full screen. The person speaking has a green border.</p>

<h2>6. Recording · Transcript · Auto capture · Minutes</h2>
<h3>Recording</h3>
<p><b>⏺ Record</b> records everyone’s video and audio together. Everyone sees <b>● Recording</b>. Ask for consent first. The file stays on this PC (desktop app: <b>Downloads\\GT-Meet</b>).</p>
<h3>Transcript</h3>
<p>Turn on <b>✎ Transcribe</b> to convert your voice to text; it is shared with everyone as captions and transcript. Only people with transcription on are recorded, so everyone who needs it should turn it on. Change the recognition language in the Transcript tab or Settings.</p>
<div class="warn">Transcription works in Chrome/Edge; depending on the browser, audio may be sent to the browser vendor’s servers. It does not work in the desktop app — a participant using a browser can turn it on and it is shared with everyone.</div>
<h3>Auto capture of key moments</h3>
<p>Captures automatically when screen sharing starts, the shared screen changes (slide flips), keywords such as "important, decision, deadline, action item" are spoken or typed, or 📌 is pressed. View them in the Captures tab; right-click an image to save it.</p>
<h3>Minutes</h3>
<p><b>📝 Minutes</b> saves an HTML document with date, attendees, key statements, captures, full transcript and chat. Open it in a browser, add a summary, and use <b>Print → Save as PDF</b>.</p>

<h2>7. Settings</h2>
<ul>
<li><b>Devices:</b> which camera and microphone to use, and whether to start with them on.</li>
<li><b>Camera background:</b> None / Blur / Replace (4 built-in pictures or your own photo). You are separated from the background on this PC; video never leaves it. The first time takes a few seconds. On a PC the graphics card is used to cut you out more precisely, down to the hair, and to remove objects behind you such as chairs or a bed (⚙ Settings → <b>High-quality background</b>, on by default). If the graphics card is slow or missing, the basic method is used automatically. Phones use the basic method. <b>Blur only blurs your room; it does not hide it.</b> Even with a virtual background, small bits of the room can show around you when you move (a known limitation shown by research). If the room must stay hidden, turn on <b>Stronger privacy</b> in ⚙ Settings and use a tidy spot for important meetings. If the background effect stops working, your camera-off picture is sent instead of your camera.</li>
<li><b>Picture when camera is off:</b> shown to others instead of a black screen.</li>
<li><b>Language · Transcription language · Auto capture · Remote access at startup.</b></li>
</ul>
<p>Everything is saved immediately and can be changed during a meeting with <b>⚙ Settings</b>.</p>

<h2>8. Remote participants (remote access)</h2>
<p>For people anywhere on the internet, click <b>🌐 Remote access [Turn on]</b> on the start screen. An internet address is created automatically (no router setup) and included in invitations you copy afterwards.</p>
<ul>
<li>The address changes every time the program starts — always send the <b>invitation with the link</b>.</li>
<li>Remote people can only join; meetings can only be started on this PC.</li>
<li>Very strict corporate firewalls may block video.</li>
</ul>

<h2>9. Updates</h2>
<p>The desktop app checks for a new version <b>the first time you use it each day</b> (if it stays open past midnight, it checks the next time you use it).</p>
<ol>
<li>If a new version exists, it asks <b>"Update now?"</b>. During a meeting it waits until the meeting ends.</li>
<li><b>Update now</b> downloads and installs it, then restarts the app.</li>
<li><b>Later</b> leaves a notice on the start screen and in <b>⚙ Settings → About</b>, where you can click <b>Update now</b> at any time. It asks again the next day.</li>
</ol>
<div class="warn"><b>Required updates:</b> updates that change how meetings work and are not compatible with older versions are marked "required". Without them you <b>cannot create or join meetings</b> with people on the new version, and the meeting screen tells you to update.</div>

<h2>10. Keyboard shortcuts</h2>
<table>
<tr><td><kbd>M</kbd></td><td>Mic on/off</td></tr>
<tr><td><kbd>V</kbd></td><td>Camera on/off</td></tr>
<tr><td><kbd>B</kbd></td><td>Mark (📌)</td></tr>
<tr><td><kbd>F1</kbd></td><td>User guide</td></tr>
<tr><td><kbd>F11</kbd></td><td>Full screen (desktop app)</td></tr>
</table>

<h2>11. Troubleshooting</h2>
<ul>
<li><b>Camera/mic not working:</b> check whether another app (Zoom, Teams…) is using it and re-select the device in Settings. In a browser, allow permissions via the lock icon in the address bar.</li>
<li><b>Video stuck on "Connecting…":</b> likely a corporate firewall. Try another network (e.g. phone hotspot).</li>
<li><b>Meeting not found:</b> check the ID and whether the host has started the meeting. IDs cannot be reused after a meeting ends.</li>
<li><b>Background effect not working:</b> the model file is downloaded once from the internet; check your connection.</li>
<li><b>Recording not saved:</b> click <b>⬇ Save recording</b> in the chat.</li>
</ul>

<h2>12. Privacy · Security</h2>
<ul>
<li>Video, audio and files are encrypted and go directly between participants; nothing is stored on the server.</li>
<li>Recordings, transcripts, captures and minutes are saved only on each person’s PC.</li>
<li>Settings (including your photos) stay on this PC.</li>
<li>Invite links contain the password — send them only to the people you invite.</li>
</ul>

<h2>13. Phones · Tablets</h2>
<h3>Android app</h3>
<ol>
<li><b>Install:</b> download the installer (GT-Meet-Android-○○.apk) on your phone and open it. If you see "Install unknown apps", turn on <b>Allow from this source</b> for that app (Files, Chrome, …).</li>
<li><b>First launch:</b> <b>Allow</b> camera, microphone and notifications.</li>
<li><b>Join:</b> long-press the invitation in your messenger and choose <b>Share → GT-Meet</b> — the meeting details are filled in. Or copy the invitation and tap <b>📋 Paste invitation</b> in the app. Enter your name and tap <b>Ask to join</b>.</li>
</ol>
<ul>
<li>The call continues when you switch to another app; a "In a meeting" notification stays at the top. Tap it to return.</li>
<li>Sound plays through the speaker (or earphones/Bluetooth if connected).</li>
<li>Recordings, minutes and received files are saved to <b>Download/GT-Meet</b>.</li>
<li>Use <b>📤 Share</b> in the meeting info to send the invitation straight to a messenger.</li>
<li>Updates: checked the first time you open the app each day. <b>Update now</b> downloads the installer — open it to install (settings are kept).</li>
</ul>
<h3>iPhone · iPad</h3>
<ul>
<li>Tap the invite link and Safari opens the join screen directly. Nothing to install.</li>
<li>If you use it often, open <b>gipter.github.io/gt-meet-releases</b> in Safari and tap Share (□↑) → <b>Add to Home Screen</b>. Open that icon and join with <b>📋 Paste invitation</b>. New versions apply automatically.</li>
</ul>
<h3>Not available on phones</h3>
<ul>
<li><b>Starting meetings</b> is done on a PC (phones can join only).</li>
<li><b>Screen sharing</b> is not supported on phones; you can still view others’ shared screens.</li>
<li><b>Transcription</b> is not available in the Android app. Open the invite link in Chrome (Android) or Safari (iPhone) to use it.</li>
<li>Background effects may be slow depending on the device. If so, set them to "None".</li>
</ul>
<div class="tip">Use the <b>☰</b> button at the top to open the chat/transcript/captures/participants panel and ✕ to close it. A red dot on ☰ means new chat. Portrait and landscape are both supported.</div>
`;

HELP.ja = `
<h2>1. はじめに</h2>
<p>GT-Meet はチーム向けのビデオ会議アプリです。映像・音声・ファイルは参加者間で直接やり取りされ、サーバーには保存されません。</p>
<ul>
<li><b>PCアプリ:</b> インストーラー(GT-Meet-Setup)でインストールし、デスクトップの <b>GT-Meet</b> から起動します。「WindowsによってPCが保護されました」と表示されたら <b>詳細情報 → 実行</b> を押してください。</li>
<li><b>インストールなし:</b> プログラムフォルダの <b>GT-Meet.vbs</b> をダブルクリックします(Node.js が必要)。</li>
<li><b>招待された人:</b> 招待リンクを Chrome・Edge で開くだけで参加できます。</li>
</ul>
<p>開始画面右上で <b>言語</b> を変更でき、<b>⚙ 設定</b> でカメラ・マイク・背景を事前に設定できます。設定は自動保存され、次回もそのまま適用されます。</p>

<h2>2. 会議を開く(ホスト)</h2>
<ol>
<li>名前を入力し <b>新しい会議を開始</b> を押します。</li>
<li>会議ID(9桁)とパスワード(6桁)が自動で作成され、<b>会議情報</b> が開きます。</li>
<li><b>✉ 招待文をコピー</b> を押し、メッセンジャーやメールに貼り付けて送ります。参加リンクとID・パスワードが含まれます。</li>
<li>入室しようとする人がいると上部に <b>入室リクエスト</b> が表示されます。<b>承認</b> または <b>拒否</b> を押します。複数なら <b>すべて承認</b> もできます。</li>
</ol>
<div class="tip">会議情報は上部の <b>ID ○○○ ○○○ ○○○</b> ボタンや <b>✉ 招待</b> からいつでも開けます。</div>

<h2>3. 会議に参加</h2>
<ul>
<li><b>リンクを受け取った場合:</b> IDとパスワードが入力済みです。名前を入れて <b>参加をリクエスト</b> を押します。</li>
<li><b>ID・パスワードのみの場合:</b> <b>会議に参加</b> を押して入力し、<b>参加をリクエスト</b> を押します。</li>
<li><b>PCアプリで他の人の会議に参加:</b> 会議ID欄に受け取った <b>招待リンクをそのまま貼り付ける</b> と、会議アドレス・ID・パスワードが自動入力されます。</li>
<li>ホストが承認すると自動的に入室します。待機中は <b>リクエストを取り消す</b> でやめられます。</li>
</ul>
<div class="warn">10分以内にパスワードや会議IDを8回間違えると、10分間参加できなくなります。</div>

<h2>4. ホスト機能</h2>
<ul>
<li><b>待機室:</b> オフにするとパスワードが正しければすぐ入室できます。</li>
<li><b>会議をロック:</b> 新しい参加者をブロックします。上部に 🔒 が表示されます。</li>
<li><b>参加者タブ:</b> 参加者ごとに <b>ホストを譲る</b>・<b>退出させる</b> ができます。</li>
<li><b>退出:</b> <b>全員の会議を終了</b> か <b>自分だけ退出</b> を選びます。自分だけ退出すると最初に入室した参加者がホストを引き継ぎます。</li>
</ul>

<h2>5. 会議中の機能</h2>
<table>
<tr><th>ボタン</th><th>機能</th></tr>
<tr><td>マイク / カメラ</td><td>オン・オフします。オフのときはアイコンに赤い X が付き、相手の画面と参加者リストにも表示されます。</td></tr>
<tr><td>画面共有</td><td>モニター全体または特定のウィンドウを共有します。共有画面は大きく表示されます。</td></tr>
<tr><td>チャット</td><td>右パネルでメッセージを送ります。Enter で送信、Shift+Enter で改行。</td></tr>
<tr><td>ファイル送信</td><td>📎 ボタンまたはチャットにドラッグ。参加者へ直接送信され、1ファイル1GBまで。受け取ったファイルは送信者を確認してから開いてください。</td></tr>
<tr><td>重要マーク 📌</td><td>この瞬間を全参加者の画面で同時にキャプチャし、メモを残します。</td></tr>
</table>
<p>タイルをダブルクリックすると全画面表示になります。話している人は緑の枠で表示されます。</p>

<h2>6. 録画・文字起こし・自動キャプチャ・議事録</h2>
<h3>録画</h3>
<p><b>⏺ 録画</b> で全参加者の映像と音声をまとめて録画します。全員に <b>● 録画中</b> と表示されます。事前に同意を得てください。ファイルはこのPCにのみ保存されます(PCアプリは <b>ダウンロード\\GT-Meet</b> フォルダ)。</p>
<h3>文字起こし</h3>
<p><b>✎ 文字起こし</b> をオンにすると自分の声が文字になり、字幕と文字起こしとして全員に共有されます。オンにした人の発言だけが記録されるので、必要な人は全員オンにしてください。認識言語は文字起こしタブまたは設定で変更します。</p>
<div class="warn">文字起こしは Chrome・Edge で動作し、ブラウザによっては音声が提供元のサーバーに送信されます。PCアプリでは動作しないため、ブラウザで参加した人がオンにすると全員に共有されます。</div>
<h3>重要シーンの自動キャプチャ</h3>
<p>画面共有の開始、共有画面の切り替え(スライド送り)、「重要・決定・確定・締切・アクションアイテム」などのキーワードが発話やチャットに出たとき、📌 を押したときに自動でキャプチャします。キャプチャタブで確認し、画像を右クリックすると保存できます。</p>
<h3>議事録</h3>
<p><b>📝 議事録</b> を押すと、日時・参加者・重要発言・キャプチャ・文字起こし全文・チャットをまとめた文書(HTML)が保存されます。ブラウザで開いて要約を書き、<b>印刷 → PDFとして保存</b> もできます。</p>

<h2>7. 設定</h2>
<ul>
<li><b>デバイス:</b> 使用するカメラ・マイクと、オンで開始するかを選びます。</li>
<li><b>カメラ背景:</b> そのまま / 背景ぼかし / 背景を変更(標準画像4種または自分の写真)。人物と背景はこのPC内で判別し、映像は外部に送信されません。初回は数秒かかります。PCではグラフィックカードで髪の毛の境界までより精密に判別し、後ろの椅子やベッドなどの物も消します(⚙ 設定 → <b>高品質な背景処理</b>、既定でオン)。グラフィックカードが遅い・ない場合は自動で標準の方式になります。スマートフォンは標準の方式です。 <b>背景ぼかしは部屋をぼかすだけで、隠すわけではありません。</b>仮想背景でも、動くと人物の周りに部屋がわずかに映ることがあります(研究で知られている限界)。部屋を確実に隠したい場合は ⚙ 設定の<b>プライバシー保護を強化</b>をオンにし、大切な会議は片付いた場所で行ってください。背景エフェクトが止まった場合は、カメラ映像の代わりにオフ時の画像を送信します。</li>
<li><b>カメラオフ時の画像:</b> カメラをオフにすると黒い画面の代わりにこの画像が相手に表示されます。</li>
<li><b>言語・文字起こしの言語・自動キャプチャ・起動時の外部接続。</b></li>
</ul>
<p>設定はすぐに保存され、会議中も <b>⚙ 設定</b> で変更できます。</p>

<h2>8. 遠隔地の参加者(外部接続)</h2>
<p>インターネット上のどこからでも参加してもらうには、開始画面の <b>🌐 外部接続 [オンにする]</b> を押します。インターネットアドレスが自動で作成され(ルーター設定不要)、その後コピーする招待文に含まれます。</p>
<ul>
<li>アドレスは起動するたびに変わるため、<b>リンク入りの招待文</b> を送ってください。</li>
<li>外部の人は参加のみ可能で、会議を開けるのはこのPCだけです。</li>
<li>ファイアウォールが非常に厳しい企業・機関のネットワークでは映像が接続できない場合があります。</li>
</ul>

<h2>9. アップデート</h2>
<p>PCアプリは <b>その日最初に起動したとき</b> に新しいバージョンを確認します(起動したまま日付が変わった場合は、翌日最初に使うときに確認)。</p>
<ol>
<li>新しいバージョンがあると <b>「今すぐアップデートしますか?」</b> と尋ねます。会議中は会議の終了後に尋ねます。</li>
<li><b>今すぐアップデート</b> を押すとダウンロード・インストールして再起動します。</li>
<li><b>後で</b> を押すと開始画面と <b>⚙ 設定 → プログラム情報</b> に案内が残り、いつでも <b>今すぐアップデート</b> で進められます。翌日最初の起動時にも再度尋ねます。</li>
</ol>
<div class="warn"><b>必須アップデート:</b> 会議の仕組みが変わり旧バージョンと互換性がないアップデートは「必須」と表示されます。アップデートしないと新しいバージョンの利用者と <b>会議を作成・参加できず</b>、会議画面にアップデートの案内が表示されます。</div>

<h2>10. ショートカット</h2>
<table>
<tr><td><kbd>M</kbd></td><td>マイク オン/オフ</td></tr>
<tr><td><kbd>V</kbd></td><td>カメラ オン/オフ</td></tr>
<tr><td><kbd>B</kbd></td><td>重要マーク(📌)</td></tr>
<tr><td><kbd>F1</kbd></td><td>使い方ガイド</td></tr>
<tr><td><kbd>F11</kbd></td><td>全画面(PCアプリ)</td></tr>
</table>

<h2>11. トラブルシューティング</h2>
<ul>
<li><b>カメラ・マイクが使えない:</b> 他のアプリ(Zoom、Teams など)が使用中でないか確認し、設定でデバイスを選び直してください。ブラウザではアドレスバー左の鍵アイコンから権限を許可します。</li>
<li><b>相手の映像が「接続中…」のまま:</b> 企業のファイアウォールが原因の可能性があります。別のネットワーク(スマホのテザリングなど)で試してください。</li>
<li><b>会議が見つからない:</b> 会議IDと、ホストが会議を開始したかを確認してください。終了した会議のIDは再利用できません。</li>
<li><b>背景エフェクトが動かない:</b> 初回はインターネットからモデルファイルをダウンロードします。接続を確認してください。</li>
<li><b>録画ファイルが保存されない:</b> チャットの <b>⬇ 録画ファイルを保存</b> を押してください。</li>
</ul>

<h2>12. プライバシー・セキュリティ</h2>
<ul>
<li>映像・音声・ファイルは暗号化されて参加者間で直接やり取りされ、サーバーには保存されません。</li>
<li>録画・文字起こし・キャプチャ・議事録は各自のPCにのみ保存されます。</li>
<li>設定(背景写真やオフ時の画像を含む)はこのPCにのみ保存されます。</li>
<li>招待リンクにはパスワードが含まれるため、必要な人にだけ送ってください。</li>
</ul>

<h2>13. スマートフォン · タブレット</h2>
<h3>Android アプリ</h3>
<ol>
<li><b>インストール:</b> インストールファイル(GT-Meet-Android-○○.apk)をスマホでダウンロードして開きます。「提供元不明のアプリ」と表示されたら、そのアプリ(ファイル・Chrome など)で <b>この提供元を許可</b> をオンにします。</li>
<li><b>初回起動:</b> カメラ・マイク・通知を <b>許可</b> します。</li>
<li><b>参加:</b> メッセンジャーで受け取った招待文を長押しして <b>共有 → GT-Meet</b> を選ぶと会議情報が入力されます。または招待文をコピーしてアプリの <b>📋 招待文を貼り付け</b> を押します。名前を入れて <b>参加をリクエスト</b> を押します。</li>
</ol>
<ul>
<li>会議中に他のアプリに切り替えても通話は続き、上部に「会議中」の通知が表示されます。押すと会議に戻ります。</li>
<li>音はスピーカーから出ます(イヤホン・Bluetooth 接続時はそちら)。</li>
<li>録画・議事録・受信ファイルは <b>Download/GT-Meet</b> フォルダに保存されます。</li>
<li>会議情報の <b>📤 共有</b> で招待文をメッセンジャーにすぐ送れます。</li>
<li>アップデート: その日最初の起動時に確認し、新しいバージョンがあれば尋ねます。<b>今すぐアップデート</b> でインストールファイルをダウンロードして開いてください(設定は保持されます)。</li>
</ul>
<h3>iPhone · iPad</h3>
<ul>
<li>招待リンクを押すと Safari で参加画面が開きます。インストール不要です。</li>
<li>よく使う場合は Safari で <b>gipter.github.io/gt-meet-releases</b> を開き、共有ボタン(□↑)→ <b>ホーム画面に追加</b>。そのアイコンから開いて <b>📋 招待文を貼り付け</b> で参加します。新しいバージョンは自動で反映されます。</li>
</ul>
<h3>スマートフォンでできないこと</h3>
<ul>
<li><b>会議の作成</b> は PC で行います(スマホは参加専用)。</li>
<li><b>画面共有</b> はスマホでは使えません。他の人の共有画面は見られます。</li>
<li><b>文字起こし</b> は Android アプリでは使えません。スマホの Chrome や iPhone の Safari で招待リンクを開いて参加すると使えます。</li>
<li>背景エフェクトは端末の性能によって遅くなることがあります。その場合は設定で「そのまま」にしてください。</li>
</ul>
<div class="tip">上部の <b>☰</b> でチャット・文字起こし・キャプチャ・参加者パネルを開き、✕ で閉じます。☰ に赤い点があれば新しいチャットです。縦・横どちらの画面にも対応しています。</div>
`;

HELP.zh = `
<h2>1. 入门</h2>
<p>GT-Meet 是面向团队的视频会议程序。视频、音频和文件在参会者之间直接传输,不会保存在服务器上。</p>
<ul>
<li><b>桌面应用:</b> 运行安装程序(GT-Meet-Setup)安装后,从桌面的 <b>GT-Meet</b> 图标启动。若出现"Windows 已保护你的电脑",请点击 <b>更多信息 → 仍要运行</b>。</li>
<li><b>免安装:</b> 双击程序文件夹中的 <b>GT-Meet.vbs</b>(需要 Node.js)。</li>
<li><b>受邀者:</b> 在 Chrome 或 Edge 中打开邀请链接即可加入,无需安装。</li>
</ul>
<p>可在开始界面右上角切换 <b>语言</b>,并在 <b>⚙ 设置</b> 中预先设置摄像头、麦克风和背景。设置会自动保存,下次启动时直接生效。</p>

<h2>2. 发起会议(主持人)</h2>
<ol>
<li>输入姓名并点击 <b>发起新会议</b>。</li>
<li>系统自动生成会议ID(9位)和密码(6位),并打开 <b>会议信息</b> 窗口。</li>
<li>点击 <b>✉ 复制邀请</b>,粘贴到聊天工具或邮件中发送。邀请中包含加入链接以及ID和密码。</li>
<li>有人申请加入时,顶部会出现 <b>入会请求</b>。点击 <b>批准</b> 或 <b>拒绝</b>;多人时可 <b>全部批准</b>。</li>
</ol>
<div class="tip">可随时通过顶部的 <b>ID ○○○ ○○○ ○○○</b> 按钮或 <b>✉ 邀请</b> 重新打开会议信息。</div>

<h2>3. 加入会议</h2>
<ul>
<li><b>收到链接:</b> ID和密码已自动填写。输入姓名后点击 <b>申请加入</b>。</li>
<li><b>只有ID和密码:</b> 点击 <b>加入会议</b>,输入后点击 <b>申请加入</b>。</li>
<li><b>用桌面应用加入他人的会议:</b> 在会议ID栏中 <b>直接粘贴完整的邀请链接</b>,会议地址、ID和密码会自动填写。</li>
<li>主持人批准后自动入会。等待期间可点击 <b>取消申请</b>。</li>
</ul>
<div class="warn">10 分钟内输错密码或会议ID 8 次,将在 10 分钟内无法加入。</div>

<h2>4. 主持人功能</h2>
<ul>
<li><b>等候室:</b> 关闭后,密码正确即可直接入会。</li>
<li><b>锁定会议:</b> 阻止新参会者加入,顶部显示 🔒。</li>
<li><b>参会者标签:</b> 可对每位参会者 <b>移交主持人</b> 或 <b>移出</b>。</li>
<li><b>离开:</b> 选择 <b>为所有人结束会议</b> 或 <b>仅我离开</b>;仅我离开时,最早入会的参会者成为主持人。</li>
</ul>

<h2>5. 会议中功能</h2>
<table>
<tr><th>按钮</th><th>功能</th></tr>
<tr><td>麦克风 / 摄像头</td><td>开启或关闭。关闭时图标上显示红色 X,对方画面和参会者列表中也会显示。</td></tr>
<tr><td>共享屏幕</td><td>共享整个显示器或单个窗口,共享画面会放大显示。</td></tr>
<tr><td>聊天</td><td>在右侧面板发送消息。Enter 发送,Shift+Enter 换行。</td></tr>
<tr><td>发送文件</td><td>点击 📎 或拖入聊天区。直接发送给参会者,每个文件最大 1GB。打开收到的文件前请确认发送者。</td></tr>
<tr><td>标记重点 📌</td><td>在所有参会者的画面上同时截取当前时刻,并可附备注。</td></tr>
</table>
<p>双击画面可全屏查看。正在说话的人会显示绿色边框。</p>

<h2>6. 录制 · 转写 · 自动截图 · 会议纪要</h2>
<h3>录制</h3>
<p>点击 <b>⏺ 录制</b> 将所有参会者的画面和声音合并录制。所有人都会看到 <b>● 录制中</b>。录制前请征得同意。文件只保存在本机(桌面应用保存在 <b>下载\\GT-Meet</b> 文件夹)。</p>
<h3>转写</h3>
<p>开启 <b>✎ 转写</b> 后,你的语音会被转成文字,以字幕和转写记录的形式共享给所有人。只记录开启转写者的发言,需要的人都请开启。识别语言可在转写标签或设置中更改。</p>
<div class="warn">转写在 Chrome/Edge 中可用;取决于浏览器,音频可能会发送到浏览器厂商的服务器。桌面应用中无法使用转写,可由通过浏览器加入的参会者开启,内容会共享给所有人。</div>
<h3>重要时刻自动截图</h3>
<p>在开始共享屏幕、共享画面切换(翻页)、说话或聊天中出现"重要·决定·确定·截止·行动项"等关键词、或点击 📌 时自动截图。可在截图标签中查看,右键图片即可保存。</p>
<h3>会议纪要</h3>
<p>点击 <b>📝 会议纪要</b>,将保存包含时间、参会者、关键发言、截图、完整转写和聊天的文档(HTML)。在浏览器中打开后可填写摘要,并通过 <b>打印 → 另存为 PDF</b>。</p>

<h2>7. 设置</h2>
<ul>
<li><b>设备:</b> 选择使用的摄像头和麦克风,以及是否开启后入会。</li>
<li><b>摄像头背景:</b> 无 / 背景虚化 / 替换背景(4 张内置图片或自己的照片)。人物与背景在本机内分离,视频不会外传。首次需要几秒钟准备。在电脑上会使用显卡更精细地分离(连头发边缘也很清晰),并去掉身后的椅子、床等物品(⚙ 设置 → <b>高质量背景处理</b>,默认开启)。显卡较慢或没有显卡时会自动改用基本方式。手机使用基本方式。 <b>背景虚化只是让房间变模糊,并不能遮住房间。</b>即使使用虚拟背景,移动时人物周围也可能少量露出房间(研究已证实的局限)。如需确保隐藏房间,请在 ⚙ 设置中开启<b>加强隐私保护</b>,重要会议请在整洁的位置进行。背景效果停止工作时,会发送摄像头关闭时的图片而非摄像头画面。</li>
<li><b>关闭摄像头时显示的图片:</b> 关闭摄像头后,对方看到的是这张图片而不是黑屏。</li>
<li><b>语言 · 转写语言 · 自动截图 · 启动时开启外部访问。</b></li>
</ul>
<p>所有设置会立即保存,会议中也可通过 <b>⚙ 设置</b> 更改。</p>

<h2>8. 远程参会者(外部访问)</h2>
<p>如需让互联网上任何地方的人加入,请在开始界面点击 <b>🌐 外部访问 [开启]</b>。系统会自动生成互联网地址(无需设置路由器),之后复制的邀请中会包含该地址。</p>
<ul>
<li>每次启动程序地址都会变化,请发送 <b>包含链接的邀请</b>。</li>
<li>外部人员只能加入,只有本机可以发起会议。</li>
<li>在防火墙非常严格的企业或机构网络中,视频可能无法连接。</li>
</ul>

<h2>9. 更新</h2>
<p>桌面应用会在 <b>每天第一次使用时</b> 检查新版本(如果程序跨过零点一直开着,则在第二天第一次使用时检查)。</p>
<ol>
<li>如有新版本,会询问 <b>"现在更新吗?"</b>。会议中会等到会议结束后再询问。</li>
<li>点击 <b>立即更新</b> 将下载并安装,然后重启程序。</li>
<li>点击 <b>稍后</b> 后,开始界面和 <b>⚙ 设置 → 程序信息</b> 中会保留提示,可随时点击 <b>立即更新</b>。第二天第一次启动时会再次询问。</li>
</ol>
<div class="warn"><b>必需更新:</b> 会议方式发生变化、与旧版本不兼容的更新会标记为"必需"。不更新将 <b>无法与新版本用户创建或加入会议</b>,会议界面会提示更新。</div>

<h2>10. 快捷键</h2>
<table>
<tr><td><kbd>M</kbd></td><td>麦克风 开/关</td></tr>
<tr><td><kbd>V</kbd></td><td>摄像头 开/关</td></tr>
<tr><td><kbd>B</kbd></td><td>标记重点(📌)</td></tr>
<tr><td><kbd>F1</kbd></td><td>使用说明</td></tr>
<tr><td><kbd>F11</kbd></td><td>全屏(桌面应用)</td></tr>
</table>

<h2>11. 故障排除</h2>
<ul>
<li><b>摄像头/麦克风无法使用:</b> 检查是否被其他程序(Zoom、Teams 等)占用,并在设置中重新选择设备。在浏览器中,请通过地址栏左侧的锁形图标允许权限。</li>
<li><b>对方画面一直显示"连接中…":</b> 可能是企业防火墙所致。请尝试其他网络(如手机热点)。</li>
<li><b>找不到会议:</b> 请检查会议ID,并确认主持人已开始会议。会议结束后ID无法再次使用。</li>
<li><b>背景效果无法使用:</b> 首次需要从互联网下载模型文件,请检查网络连接。</li>
<li><b>录制文件未保存:</b> 请点击聊天区中的 <b>⬇ 保存录制文件</b>。</li>
</ul>

<h2>12. 隐私 · 安全</h2>
<ul>
<li>视频、音频和文件经过加密,在参会者之间直接传输,不会保存在服务器上。</li>
<li>录制、转写、截图和会议纪要只保存在各自的电脑上。</li>
<li>设置(包括背景照片和关闭摄像头时的图片)只保存在本机。</li>
<li>邀请链接中包含密码,请只发送给需要参会的人。</li>
</ul>

<h2>13. 手机 · 平板</h2>
<h3>安卓应用</h3>
<ol>
<li><b>安装:</b> 在手机上下载安装包(GT-Meet-Android-○○.apk)并打开。若提示"安装未知应用",请在对应应用(文件、Chrome 等)中开启 <b>允许来自此来源</b>。</li>
<li><b>首次启动:</b> <b>允许</b> 摄像头、麦克风和通知权限。</li>
<li><b>加入:</b> 在聊天工具中长按收到的邀请,选择 <b>分享 → GT-Meet</b>,会议信息会自动填写。或复制邀请后点击应用中的 <b>📋 粘贴邀请</b>。输入姓名后点击 <b>申请加入</b>。</li>
</ol>
<ul>
<li>会议中切换到其他应用,通话仍会继续,顶部会显示"会议中"通知,点按即可返回。</li>
<li>声音从扬声器播放(连接耳机/蓝牙时从耳机播放)。</li>
<li>录制、会议纪要和收到的文件保存在 <b>Download/GT-Meet</b> 文件夹。</li>
<li>在会议信息中点击 <b>📤 分享</b> 可直接把邀请发到聊天工具。</li>
<li>更新: 每天第一次打开时检查,有新版本会询问。点击 <b>立即更新</b> 会下载安装包,打开即可安装(设置会保留)。</li>
</ul>
<h3>iPhone · iPad</h3>
<ul>
<li>点按邀请链接,Safari 会直接打开加入界面,无需安装。</li>
<li>如经常使用,请用 Safari 打开 <b>gipter.github.io/gt-meet-releases</b>,点分享按钮(□↑)→ <b>添加到主屏幕</b>。之后从该图标打开,用 <b>📋 粘贴邀请</b> 加入。新版本会自动生效。</li>
</ul>
<h3>手机上不可用的功能</h3>
<ul>
<li><b>发起会议</b> 需在电脑上进行(手机仅可加入)。</li>
<li>手机不支持 <b>共享屏幕</b>,但可以观看他人共享的画面。</li>
<li>安卓应用不支持 <b>转写</b>。用手机 Chrome 或 iPhone Safari 打开邀请链接加入即可使用。</li>
<li>背景效果可能因设备性能而变慢,此时请在设置中改为"无"。</li>
</ul>
<div class="tip">点击顶部的 <b>☰</b> 打开聊天/转写/截图/参会者面板,点 ✕ 关闭。☰ 上出现红点表示有新聊天。支持横屏和竖屏。</div>
`;
