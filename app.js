document.addEventListener('DOMContentLoaded', () => {
    // === 탭 전환 로직 ===
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.target).classList.add('active');
        });
    });

    // === Matter.js 공통 변수 ===
    const { Engine, Render, Runner, World, Bodies, Body, Mouse, MouseConstraint, Constraint, Events, Composite } = Matter;
    const CANVAS_WIDTH = 800;
    const CANVAS_HEIGHT = 450;

    // 공통 드래그 시작 이벤트 설정 (HTML5 Drag & Drop)
    document.querySelectorAll('.draggable-item').forEach(item => {
        item.addEventListener('dragstart', e => {
            e.dataTransfer.setData('text', item.dataset.type);
            item.style.opacity = '0.5';
        });
        item.addEventListener('dragend', e => {
            item.style.opacity = '1';
        });
    });

    // ==========================================
    // 1. 자유낙하 샌드박스 (Sandbox)
    // ==========================================
    const engineSB = Engine.create();
    const renderSB = Render.create({
        element: document.getElementById('sandbox-area'),
        engine: engineSB,
        options: {
            width: CANVAS_WIDTH,
            height: CANVAS_HEIGHT,
            wireframes: false,
            background: 'transparent'
        }
    });

    // 바닥 (Floor)
    const floorSB = Bodies.rectangle(CANVAS_WIDTH/2, CANVAS_HEIGHT, CANVAS_WIDTH + 100, 40, { 
        isStatic: true, 
        render: { fillStyle: '#B2E2F2' } 
    });
    World.add(engineSB.world, [floorSB]);

    // 마우스 컨트롤
    const mouseSB = Mouse.create(renderSB.canvas);
    const mcSB = MouseConstraint.create(engineSB, { 
        mouse: mouseSB, 
        constraint: { render: { visible: false } } 
    });
    World.add(engineSB.world, mcSB);
    renderSB.mouse = mouseSB;

    // 드래그 앤 드롭으로 물체 생성
    const sandboxArea = document.getElementById('sandbox-area');
    sandboxArea.addEventListener('dragover', e => e.preventDefault());
    sandboxArea.addEventListener('drop', e => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text');
        
        // 반응형 캔버스 좌표 계산
        const rect = sandboxArea.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        const isVacuum = document.getElementById('vacuum-toggle').checked;
        const airFrictionMultiplier = isVacuum ? 0 : 1;

        let body;
        if (type === 'watermelon') {
            body = Bodies.circle(x, y, 40, { mass: 10, frictionAir: 0.05 * airFrictionMultiplier, render: { fillStyle: '#FFB7B2' }, label: '🍉', restitution: 0.8 });
        } else if (type === 'bear') {
            body = Bodies.rectangle(x, y, 70, 70, { mass: 5, frictionAir: 0.15 * airFrictionMultiplier, render: { fillStyle: '#dcb897' }, label: '🧸', restitution: 0.2, chamfer: { radius: 20 } });
        } else if (type === 'feather') {
            body = Bodies.rectangle(x, y, 20, 50, { mass: 0.1, frictionAir: 0.3 * airFrictionMultiplier, render: { fillStyle: '#fff' }, label: '🪶', restitution: 0.1 });
        }
        
        if(body) World.add(engineSB.world, body);
    });

    // 진공 모드 토글
    document.getElementById('vacuum-toggle').addEventListener('change', (e) => {
        const isVacuum = e.target.checked;
        const label = document.getElementById('vacuum-label');
        
        if (isVacuum) {
            label.innerText = '🌌 진공 상태 (우주 모드)';
            label.style.backgroundColor = '#2b2b42';
            Composite.allBodies(engineSB.world).forEach(b => {
                if(!b.isStatic) b.frictionAir = 0; // 공기 저항 0
            });
        } else {
            label.innerText = '💨 공기 저항 (일반 모드)';
            label.style.backgroundColor = 'var(--secondary-color)';
            Composite.allBodies(engineSB.world).forEach(b => {
                if(!b.isStatic) {
                    if (b.label === '🍉') b.frictionAir = 0.05;
                    else if (b.label === '🧸') b.frictionAir = 0.15;
                    else if (b.label === '🪶') b.frictionAir = 0.3;
                }
            });
        }
    });

    // 샌드박스 렌더링 (이모지 그리기)
    Events.on(renderSB, 'afterRender', function() {
        const ctx = renderSB.context;
        ctx.font = '50px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        Composite.allBodies(engineSB.world).forEach(b => {
            if(b.label && ['🍉', '🧸', '🪶'].includes(b.label)) {
                ctx.save();
                ctx.translate(b.position.x, b.position.y);
                ctx.rotate(b.angle);
                ctx.fillText(b.label, 0, 0);
                ctx.restore();
            }
        });
    });

    Render.run(renderSB);
    Runner.run(Runner.create(), engineSB);


    // ==========================================
    // 2. 돌림힘 퍼즐 (Puzzle)
    // ==========================================
    const enginePZ = Engine.create();
    const renderPZ = Render.create({
        element: document.getElementById('puzzle-area'),
        engine: enginePZ,
        options: { width: CANVAS_WIDTH, height: CANVAS_HEIGHT, wireframes: false, background: 'transparent' }
    });

    // 시소 (Seesaw)
    const cx = CANVAS_WIDTH / 2;
    const cy = CANVAS_HEIGHT - 100;
    
    // 시소 지지대
    const base = Bodies.polygon(cx, cy + 40, 3, 50, { isStatic: true, render: { fillStyle: '#a5d6a7' } });
    const pivot = Bodies.circle(cx, cy, 10, { isStatic: true, render: { fillStyle: '#555' } });
    
    // 시소 판자
    const board = Bodies.rectangle(cx, cy, 600, 20, { 
        render: { fillStyle: '#dcb897' }, 
        mass: 10, // 무거운 판자
        friction: 0.8
    });
    
    const seesawConstraint = Constraint.create({
        bodyA: board,
        pointA: { x: 0, y: 0 },
        bodyB: pivot,
        pointB: { x: 0, y: 0 },
        stiffness: 1,
        length: 0
    });

    // 왼쪽의 목표 무게 (코끼리 4kg)
    const elephant = Bodies.circle(cx - 200, cy - 50, 45, { 
        mass: 4, 
        render: { fillStyle: 'rgba(0,0,0,0.1)' }, 
        label: '🐘',
        friction: 0.8
    });

    World.add(enginePZ.world, [base, pivot, board, seesawConstraint, elephant]);

    // 퍼즐 마우스 컨트롤
    const mousePZ = Mouse.create(renderPZ.canvas);
    const mcPZ = MouseConstraint.create(enginePZ, { 
        mouse: mousePZ, 
        constraint: { render: { visible: false } } 
    });
    World.add(enginePZ.world, mcPZ);
    renderPZ.mouse = mousePZ;

    // 퍼즐 드래그 앤 드롭
    const puzzleArea = document.getElementById('puzzle-area');
    puzzleArea.addEventListener('dragover', e => e.preventDefault());
    puzzleArea.addEventListener('drop', e => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text');
        
        const rect = puzzleArea.getBoundingClientRect();
        const scaleX = CANVAS_WIDTH / rect.width;
        const scaleY = CANVAS_HEIGHT / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
        
        let body;
        if (type === 'squirrel') {
            body = Bodies.circle(x, y, 25, { mass: 1, render: { fillStyle: 'rgba(0,0,0,0.1)' }, label: '🐿️' });
        } else if (type === 'rabbit') {
            body = Bodies.circle(x, y, 35, { mass: 2, render: { fillStyle: 'rgba(0,0,0,0.1)' }, label: '🐇' });
        } else if (type === 'elephant') {
            body = Bodies.circle(x, y, 45, { mass: 4, render: { fillStyle: 'rgba(0,0,0,0.1)' }, label: '🐘' });
        }
        
        if(body) World.add(enginePZ.world, body);
    });

    // 퍼즐 렌더링 (이모지 그리기)
    Events.on(renderPZ, 'afterRender', function() {
        const ctx = renderPZ.context;
        ctx.font = '50px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        Composite.allBodies(enginePZ.world).forEach(b => {
            if(b.label && ['🐿️', '🐇', '🐘'].includes(b.label)) {
                ctx.save();
                ctx.translate(b.position.x, b.position.y);
                ctx.rotate(b.angle);
                ctx.fillText(b.label, 0, 0);
                ctx.restore();
            }
        });
    });

    Render.run(renderPZ);
    Runner.run(Runner.create(), enginePZ);

    // ==========================================
    // 3. 평형 성공 체크 (Gamification)
    // ==========================================
    let successConfettiFired = false;
    Events.on(enginePZ, 'afterUpdate', function() {
        // 시소가 수평(angle이 0에 매우 근접)이고, 각속도가 낮을 때
        const angle = board.angle;
        const angularVelocity = board.angularVelocity;
        
        if (!successConfettiFired && Math.abs(angle) < 0.03 && Math.abs(angularVelocity) < 0.005) {
            // 오른쪽에 올려진 동물이 최소 1개 이상인지 확인
            const rightBodies = Composite.allBodies(enginePZ.world).filter(b => b.position.x > cx && b.position.y < cy + 50 && b.label && b !== elephant);
            
            if (rightBodies.length > 0) {
                successConfettiFired = true;
                
                // 폭죽 이펙트
                confetti({
                    particleCount: 150,
                    spread: 100,
                    origin: { y: 0.5 },
                    colors: ['#FFB7B2', '#B2E2F2', '#FDFD96']
                });
                
                // 뉴모피즘 UI 바운스 애니메이션
                document.getElementById('puzzle-area').style.transform = 'scale(1.02)';
                setTimeout(() => {
                    document.getElementById('puzzle-area').style.transform = 'scale(1)';
                }, 300);

                // 3초 후 다시 폭죽 터질 수 있게 리셋 (원한다면 1회성으로 둬도 됨)
                setTimeout(() => { successConfettiFired = false; }, 3000);
            }
        }
    });
});
