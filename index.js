class Ear {
    ls = {}
    on(event, listener) {
        if (!this.ls[event]) this.ls[event] = new Set();
        let onevent = (detail) => {
            listener(detail);
        }
        this.ls[event].add(onevent);
        return () => {
            this.ls[event].delete(onevent);
        }
    }
    trigger(event, detail) {
        if (!this.ls[event]) return;
        for (let each of this.ls[event]) {
            each(detail);
        }
    }
    wait(event) {
        return new Promise(resolve => {
            let remover = this.on(event, (detail) => {
                resolve(detail);
                remover();
            });
        });
    }
    once(event, listener) {
        let remover = this.on(event, (...args) => {
            remover();
            listener(...args);
        });
    }
}

class StorageState {
    constructor(keyName = "state", defaultVal = {}, area = "local") {

        const space = area == "session" ? sessionStorage : localStorage;
        const key = keyName + "_" + "StorageState";

        const obj = space[key] ? JSON.parse(space[key]) : defaultVal;
        for (let name in defaultVal) {
            if (obj[name] === undefined) {
                obj[name] = defaultVal[name];
            }
        }

        space.setItem(key, JSON.stringify(obj));

        return new Proxy(obj, {
            set(obj, prop, newVal) {
                obj[prop] = newVal;
                space.setItem(key, JSON.stringify(obj));
                return true;
            },
            get(obj, prop) {
                if (prop === "clear") {
                    return () => {
                        for (let name in obj) {
                            delete obj[name];
                        }
                        Object.assign(obj, defaultVal);
                        space.setItem(key, JSON.stringify(obj));
                    };
                } else {
                    return obj[prop];
                }
            }
        });
    }
}

let local = new StorageState("local", {
    nowSystemSetId: "random-3-body",
    useFocus: true
});

let state;


let app;

const worker = new Worker("universe.worker.js");


const Rand3BodyDistanceM = 3;
const Rand3BodyVM = 30000 / 3.7;

const SystemSets = [
    {
        id: "sun-earth-moon",
        name: "日地月系统",
        canvas: {
            dp: 0.5 * Math.pow(10, 9),
        },
        universe: {
            timeMultiplier: 60 * 24 * 365 * 1,
            accuracy: 10 * (1 + Math.random() / 50),
            planets: [
                {
                    id: "sun",
                    m: 1.9891 * Math.pow(10, 30),
                    x: 0,
                    y: 0,
                    vx: 0,
                    vy: 0,
                    size: 20,
                    minSize: 5,
                    maxSize: 400,
                    color: "#ff7700",
                    type: "star",
                },
                {
                    id: "earth",
                    m: 5.965 * Math.pow(10, 24),
                    x: 14.95 * Math.pow(10, 10),
                    y: 0,
                    vx: 0,
                    vy: 29.783 * 1000,
                    size: 8,
                    minSize: 3,
                    maxSize: 40,
                    color: "#2C5389",
                    island: true,
                    focus: true,
                },
                {
                    id: "moon",
                    m: 7.349 * Math.pow(10, 22),
                    x: 14.9884 * Math.pow(10, 10),
                    y: 0,
                    vx: 0,
                    vy: 29.783 * 1000 - 1023,
                    size: 0.5,
                    // minSize: 0.1,
                    maxSize: 15,
                    color: "#91969C",
                },
            ]
        },
    },
    {
        id: "double-star",
        name: "双星系统",
        tracksParams: {
            tracksPerSecCount: 10,
        },
        canvas: {
            dp: 3 * Math.pow(10, 9),
        },
        universe: {
            timeMultiplier: 60 * 24 * 365 * 10,
            accuracy: 100 * (1 + Math.random() / 50),
            planets: [
                {
                    id: "s3",
                    m: 2 * Math.pow(10, 30),
                    "x": 170332027776.125,
                    "y": 456237186783.9531,
                    "vx": 10432.804838576078,
                    "vy": -1424.7692328822236,
                    class: "sun",
                    size: 12,
                    minSize: 5,
                    color: "#FACA86",
                    type: "star",
                },
                {
                    id: "s1",
                    m: 2.5 * Math.pow(10, 30),
                    "x": -170332027776.125,
                    "y": -456237186783.9492,
                    "vx": -6746.224736039533,
                    "vy": -460.0828000891626,
                    size: 9,
                    minSize: 5,
                    color: "#B70C00",
                    type: "star",
                },
                {
                    id: "e1",
                    m: 5.965 * Math.pow(10, 24),
                    x: -170332027776.125 - 14.95 * Math.pow(10, 10),
                    y: -456237186783.9492,
                    vx: 20 * 1000 * 0,
                    vy: 29.783 * 1000 * 1.15,
                    size: 7,
                    minSize: 3,
                    color: "#2C5389",
                    island: true,
                    focus: true,
                },
            ]
        }
    },
    {
        id: "random-3-body",
        name: "三体：随机初态",
        tracksParams: {
            tracksPerSecCount: 10,
        },
        canvas: {
            dp: 5 * Math.pow(10, 9),
        },
        useRandom: true,
        randomType: "CR",
        randomM: 0.5,
        universe: {
            timeMultiplier: 60 * 24 * 365 * 10,
            accuracy: 100 * (1 + Math.random() / 50),
            planets: [
                {
                    id: "s1",
                    m: 2 * Math.pow(10, 30),
                    x: -300000000000 * Rand3BodyDistanceM,
                    y: 173200000000 * Rand3BodyDistanceM,
                    vx: 0.5 * Rand3BodyVM,
                    vy: 0.866 * Rand3BodyVM,
                    size: 15,
                    minSize: 5,
                    color: "#B70C00",
                    type: "star",
                },
                {
                    id: "s2",
                    m: 2 * Math.pow(10, 30),
                    x: 300000000000 * Rand3BodyDistanceM,
                    y: 173200000000 * Rand3BodyDistanceM,
                    vx: 0.5 * Rand3BodyVM,
                    vy: -0.866 * Rand3BodyVM,
                    size: 15,
                    minSize: 5,
                    color: "#ff7700",
                    type: "star"
                },
                {
                    id: "s3",
                    m: 2 * Math.pow(10, 30),
                    x: 0,
                    y: -346400000000 * Rand3BodyDistanceM,
                    vx: -1 * Rand3BodyVM,
                    vy: 0,
                    class: "sun",
                    size: 15,
                    minSize: 5,
                    color: "#FACA86",
                    type: "star",
                },
                {
                    id: "e1",
                    m: 5.965 * Math.pow(10, 24),
                    x: 0,
                    y: 0,
                    vx: 0,
                    vy: 0,
                    size: 8,
                    minSize: 3,
                    color: "#2C5389",
                    island: true,
                    focus: true,
                },
            ]
        }
    },
    {
        id: "random-3-body-high-rand",
        name: "三体：随机初态（高随机）",
        tracksParams: {
            tracksPerSecCount: 10,
        },
        canvas: {
            dp: 5 * Math.pow(10, 9),
        },
        useRandom: true,
        randomType: "CR",
        randomM: 1.2,
        universe: {
            timeMultiplier: 60 * 24 * 365 * 10,
            accuracy: 100 * (1 + Math.random() / 50),
            planets: [
                {
                    id: "s1",
                    m: 2 * Math.pow(10, 30),
                    x: -300000000000 * Rand3BodyDistanceM,
                    y: 173200000000 * Rand3BodyDistanceM,
                    vx: 0.5 * Rand3BodyVM,
                    vy: 0.866 * Rand3BodyVM,
                    size: 15,
                    minSize: 5,
                    color: "#B70C00",
                    type: "star",
                },
                {
                    id: "s2",
                    m: 2 * Math.pow(10, 30),
                    x: 300000000000 * Rand3BodyDistanceM,
                    y: 173200000000 * Rand3BodyDistanceM,
                    vx: 0.5 * Rand3BodyVM,
                    vy: -0.866 * Rand3BodyVM,
                    size: 15,
                    minSize: 5,
                    color: "#ff7700",
                    type: "star"
                },
                {
                    id: "s3",
                    m: 2 * Math.pow(10, 30),
                    x: 0,
                    y: -346400000000 * Rand3BodyDistanceM,
                    vx: -1 * Rand3BodyVM,
                    vy: 0,
                    class: "sun",
                    size: 15,
                    minSize: 5,
                    color: "#FACA86",
                    type: "star",
                },
                {
                    id: "e1",
                    m: 5.965 * Math.pow(10, 24),
                    x: 0,
                    y: 0,
                    vx: 0,
                    vy: 0,
                    size: 8,
                    minSize: 3,
                    color: "#2C5389",
                    island: true,
                    focus: true,
                },
            ]
        }
    },
    ...ThreeBodySystemSets
];



const SystemSet = SystemSets.find(n => n.id == local.nowSystemSetId) || SystemSets[0];

document.title = `万有引力 - ${SystemSet.name}`;

let params = {
    useFocus: local.useFocus,
    focusOffsetX: 0,
    focusOffsetY: 0,
};

if (SystemSet.useRandom) {
    let tanRan = () => {
        // -1~1
        let x = 1.3;
        return Math.tan((Math.random() - 0.5) * 2 * x) / Math.tan(x);
    }
    for (let p of SystemSet.universe.planets) {
        for (let n of ['m', 'x', 'y', 'vx', 'vy']) {
            p[n] *= 1 + SystemSet.randomM * tanRan();
        }
        if (p.type == "star") p.size = (p.m / (2 * Math.pow(10, 30))) * 14;
    }
    if (SystemSet.randomType == "CR") {
        let t = SystemSet.universe.planets[Math.floor(Math.random() * 3)];
        let p = SystemSet.universe.planets[3];
        p.x = t.x * 0.78 * (1 + SystemSet.randomM / 1.5 * tanRan());
        p.y = t.y * 0.78 * (1 + SystemSet.randomM / 1.5 * tanRan());
        p.vx = -t.vx * 1.65 * (1 + SystemSet.randomM / 1.5 * tanRan());
        p.vy = -t.vy * 1.65 * (1 + SystemSet.randomM / 1.5 * tanRan());
    }
}

const planetImages = {
    "s1": "images/sun-1-400-emerge.png",
    "s2": "images/sun-4-400-emerge.png",
    "s3": "images/sun-3-400-emerge.png",
    "e1": "images/island-2-400-emerge.png",
    "sun": "images/sun-4-400-emerge.png",
    "earth": "images/earth-3-400.png",
    "moon": "images/moon-3-400.png",
};

const initialStateParams = SystemSet.universe;

const canvas = {
    c: document.querySelector("canvas"),
    dp: 3 * Math.pow(10, 9),
    scale: (screen.orientation.type === "portrait-primary" ? 2 : 1) / (window.devicePixelRatio), // 为缩小倍数 *dp
    pixelRatio: window.devicePixelRatio,
    baseX: 0,
    baseY: 0,
    lightTracksBarHeight: 40,
    ...SystemSet.canvas,
    draw() {
        // planets
        let c = this.c;
        let width = c.width = c.clientWidth * this.pixelRatio;
        let height = c.height = c.clientHeight * this.pixelRatio;

        const pen = c.getContext('2d');

        pen.fillStyle = "rgb(0,0,0)";
        pen.fillRect(0, 0, width, height);


        const lightTracksBarHeight = this.lightTracksBarHeight * this.pixelRatio;

        // draw light tracks bar
        // 挪到后面了 怕被星球覆盖

        pen.translate(width / 2, height / 2 + lightTracksBarHeight);

        let baseX = this.baseX; // 为世界尺度 单位米
        let baseY = this.baseY;

        // 不再使用 中心通过转化为相对位置实现了 ( parseStateForFocus )
        // for (let p of state.planets) {
        //     if (p.focus) {
        //         baseX = p.x;
        //         baseY = p.y;
        //     }
        // }



        // draw planets
        for (let p of state.planets) {

            let size = p.size / this.scale;// 半径
            if (p.minSize) size = Math.max(size, p.minSize * (1 + (this.pixelRatio - 1) / 2));
            if (p.maxSize) size = Math.min(size, p.maxSize * (1 + (this.pixelRatio - 1) / 2));

            // draw tracks
            let { tracks, color } = tracksManager.tracksMap.get(p.id) || { tracks: [], color: "white" };
            for (let i = 0; i < tracks.length; i++) {

                let t = tracks[i];

                let x = (t.x - baseX) / (this.dp * this.scale);
                let y = (t.y - baseY) / (this.dp * this.scale);

                pen.fillStyle = color;
                pen.fillStyle = pen.fillStyle + (((i + 1) / tracks.length) * 16 * 16 + 16 * 16).toString(16).slice(1, 3);

                let trackSize = 1.5 * (1 + (this.pixelRatio - 1) / 2);

                if (size < 10) trackSize *= size / 10;
                if (size < trackSize) trackSize = size / 2;

                pen.beginPath();
                pen.arc(x, y, trackSize, degToRad(0), degToRad(360), false);
                pen.fill();
            }


            let x = (p.x - baseX) / (this.dp * this.scale);
            let y = (p.y - baseY) / (this.dp * this.scale);

            if (planetImages[p.id]) {
                let img = planetImages[p.id];
                pen.drawImage(img, x - size, y - size, size * 2, size * 2);
            } else {

                pen.fillStyle = p.color || "rgb(255, 121, 68)";
                pen.beginPath();
                pen.arc(x, y, size, degToRad(0), degToRad(360), false);
                pen.fill();
            }

            // pen.strokeStyle = "rgba(0,0,0,0.5)";
            // pen.beginPath();
            // pen.arc(x, y, 5, degToRad(0), degToRad(360), false);
            // pen.stroke();

            // pen.fillStyle = "rgba(0,0,0,0.8)";
            // pen.beginPath();
            // pen.arc(x, y, 3, degToRad(0), degToRad(360), false);
            // pen.fill();
        }

        // draw light tracks bar

        // 复位笔
        pen.translate(-width / 2, -(height / 2 + lightTracksBarHeight));

        let lightTracks = lightTracksManager.tracks;
        for (let i = 0; i < Math.min(lightTracks.length, width); i++) {
            pen.fillStyle = lightTracks[lightTracks.length - 1 - i];
            pen.fillRect(width - i, 0, 1, lightTracksBarHeight);
        }
    }
};

const tracksManager = {
    tracksMap: new Map(),
    lastTrackLogTime: 0,
    tracksPerSecCount: 10, // 最好是60的因数
    tracksRemainTime: 60 * 3, // 保留记录的时间 秒
    ...SystemSet.tracksParams,
    onUniverseStateChange() {
        if ((state.time - this.lastTrackLogTime) >= (1 / this.tracksPerSecCount) * state.timeMultiplier) {
            for (let p of state.planets) {
                if (!this.tracksMap.has(p.id)) {
                    this.tracksMap.set(p.id, {
                        tracks: [],
                        color: p.color || p.tracksColor || "white"
                    });
                }
                let { tracks } = this.tracksMap.get(p.id);
                tracks.push({
                    x: p.x,
                    y: p.y
                });

                let overflowCount = tracks.length - this.tracksRemainTime * this.tracksPerSecCount;
                if (overflowCount > 0) tracks.splice(0, Math.floor(overflowCount));
            }
            this.lastTrackLogTime = state.time;
        }
    }
};

const lightTracksManager = {
    tracks: [],
    lastTrackLogTime: 0,
    // tracksPerSecCount: 10, // 最好是60的因数  // 使用tracksManager的该值
    tracksRemainTime: 60 * 1, // 保留记录的时间 秒 或者保留宽度像素数 两者取大
    onUniverseStateChange() {
        let tracksPerSecCount = tracksManager.tracksPerSecCount;
        if ((state.time - this.lastTrackLogTime) >= (1 / tracksPerSecCount) * state.timeMultiplier) {
            let tracks = this.tracks;
            tracks.push(state.dss.lightColor);

            let overflowCount = tracks.length - Math.max(this.tracksRemainTime * tracksPerSecCount, window.innerWidth * window.devicePixelRatio);
            if (overflowCount > 0) tracks.splice(0, Math.floor(overflowCount));
            this.lastTrackLogTime = state.time;
        }
    }
};

const universeManager = {
    ear: new Ear(),
    pause() {
        return new Promise(r => {
            this.ear.once('paused', r);
            worker.postMessage({
                cmd: "pause"
            });
        });
    },
    run() {
        return new Promise(r => {
            this.ear.once('start', r);
            worker.postMessage({
                cmd: "run"
            });
        });
    },
    knock() {
        return new Promise(r => {
            this.ear.once('knock', r);
            worker.postMessage({
                cmd: "knock"
            });
        });
    }
};

class PercentGradientGenerator {
    constructor({ start, end }) {
        Object.assign(this, { start, end });
    }
    generate(percent) {
        let re = [];
        for (let i = 0; i < Math.min(this.start.length, this.end.length); i++) {
            let s = this.start[i];
            let e = this.end[i];
            re.push((e - s) * (percent / 100) + s);
        }
        return re;
    }
}

let coldLightPercentPercentGradientGenerator = new PercentGradientGenerator({ start: [255, 246, 184], end: [0, 17, 31] });
let hotLightPercentPercentGradientGenerator = new PercentGradientGenerator({ start: [255, 246, 184], end: [172, 0, 0] });


let inited = false;

// on state update
worker.onmessage = async ({ data }) => {
    if (data.type == "state") {
        state = data.state;

        if (params.useFocus) parseStateForFocus(state); // 转化坐标为相对坐标

        state.dss = calDSS(state);

        if (!inited) {
            await init();
            inited = true;

            // run
            await universeManager.run();
        }

        app.state = state;
        tracksManager.onUniverseStateChange();
        lightTracksManager.onUniverseStateChange();

        if (data.runningStateChange) {
            universeManager.ear.trigger(state.running ? "start" : "paused");
        }

    } else if (data.type == "knock") {
        universeManager.ear.trigger("knock");
    }
};

// set initial
editUniverse(initialStateParams);

// get initial state
worker.postMessage({
    cmd: "get-state"
});


function parseStateForFocus(state) {
    // 全部转化为相对位置 并不会对宇宙运行产生影响
    let cp = state.planets.find(n => n.focus);
    if (!cp) return;
    let cx = cp.x;
    let cy = cp.y;
    for (let p of state.planets) {
        p.x = params.focusOffsetX + (p.x - cx);
        p.y = params.focusOffsetY + (p.y - cy);
    }
}

function calDSS(state) { // 计算距离相关的量 比如最近恒星 光照强度 光照拟化颜色
    const AU = 149597870700;
    const SunMass = 2 * Math.pow(10, 30);
    const sunL = 1 / Math.pow(AU, 2);

    let planets = state.planets;

    // island
    let l = planets.find(p => p.island);

    // 各个恒星的距离
    let ds = planets.filter(n => n.type == "star").map(p => ({
        m: p.m,
        d: Math.sqrt(Math.pow(p.x - l.x, 2) + Math.pow(p.y - l.y, 2))
    }));

    let light = ds.reduce((t, { m, d }) => {
        // 假设光照跟质量成正比
        return t += (m / SunMass) * ((1 / Math.pow(d, 2)) / sunL);
    }, 0);

    let lightPer;
    let lightColor;
    if (light >= 1) {
        lightPer = Math.atan(light - 1) * 100 / (Math.PI / 2);
        lightColor = hotLightPercentPercentGradientGenerator.generate(lightPer);
    } else {
        lightPer = -Math.atan(1 / light - 1) * 100 / (Math.PI / 2);
        lightColor = coldLightPercentPercentGradientGenerator.generate(Math.abs(lightPer));
    }
    lightColor = `rgb(${lightColor.join(",")})`;

    return {
        nearestAU: Math.min(...ds.map(n => n.d)) / AU,
        light,
        lightPer,
        lightColor
        // all: ds,
    };
}

async function init() {

    if (inited) return;

    // load all images
    await Promise.all(SystemSet.universe.planets.map(({ id }) => {
        return new Promise(r => {
            let src = planetImages[id];
            let image = new Image();
            planetImages[id] = image;
            image.onload = r;
            image.src = src;
        });
    }));

    (function frame() {
        if (state) {
            canvas.draw();
        }
        window.requestAnimationFrame(frame);
    })();

    app = new Vue({
        el: "main",
        data: {
            state,
            canvas,
            tracksManager,
            params,
            SystemSets,
            showLoadSetPopup: false,
            SystemSet,
            local,
            hideUI: false
        },
        methods: {
            reduceTimeMultiplier() {
                editUniverse({
                    timeMultiplier: this.state.timeMultiplier / 1.5
                });
            },
            increaseTimeMultiplier() {
                editUniverse({
                    timeMultiplier: this.state.timeMultiplier * 1.5
                });
            },
            reduceAccuracy() {
                editUniverse({
                    accuracy: this.state.accuracy / 2
                });
            },
            increaseAccuracy() {
                editUniverse({
                    accuracy: this.state.accuracy * 2
                });
            },
            zoomOut() {
                this.canvas.scale *= 2;
            },
            zoomIn() {
                this.canvas.scale /= 2;
            },
            reduceTracks() {
                this.tracksManager.tracksPerSecCount /= 2;
            },
            increaseTracks() {
                this.tracksManager.tracksPerSecCount *= 2;
            },
            reduceTracksRemainTime() {
                this.tracksManager.tracksRemainTime /= 1.5;
            },
            increaseTracksRemainTime() {
                this.tracksManager.tracksRemainTime *= 1.5;
            },
            async changeUseFocus(useFocus) {

                if (useFocus == params.useFocus) return;


                if (!useFocus) {

                    // 固定转不固定
                    // 先同步位置 能在这边转化为了相对位置 需要同步一下

                    await universeManager.pause();
                    console.log(1);
                    editUniverse({ planets: this.state.planets });
                    await universeManager.knock();

                    params.useFocus = useFocus;
                    await universeManager.run();
                } else if (useFocus) {

                    // 不固定转固定

                    // 需要锁定
                    let cp = this.state.planets.find(p => p.focus);
                    params.focusOffsetX = cp.x;
                    params.focusOffsetY = cp.y;

                    params.useFocus = useFocus;

                }

                local.useFocus = useFocus;

            }
        }
    });

    // 鼠标缩放
    window.addEventListener("wheel", function (e) {
        let toScale = e.deltaY > 0 ? 1.2 : (1 / 1.2);

        // 关注中心
        let x = e.pageX * canvas.pixelRatio - canvas.c.width / 2;
        let y = e.pageY * canvas.pixelRatio - canvas.c.height / 2 - canvas.lightTracksBarHeight * canvas.pixelRatio;

        canvas.baseX -= (x * (toScale - 1)) * canvas.scale * canvas.dp;
        canvas.baseY -= (y * (toScale - 1)) * canvas.scale * canvas.dp;

        canvas.scale *= toScale;

    });

    {

        // 鼠标挪动
        canvas.c.addEventListener("mousemove", function (e) {
            if (e.buttons !== 1) return;
            canvas.baseX -= e.movementX * canvas.pixelRatio * canvas.scale * canvas.dp;
            canvas.baseY -= e.movementY * canvas.pixelRatio * canvas.scale * canvas.dp;
        });

        const gestures = new Gestures({
            listenMultiClick: false,
            click() {
                app.hideUI = !app.hideUI;
            },
            drag({ dx, dy }) {
                dx *= canvas.pixelRatio;
                dy *= canvas.pixelRatio;
                canvas.baseX -= dx * canvas.scale * canvas.dp;
                canvas.baseY -= dy * canvas.scale * canvas.dp;
            },
            pinch({ scale: toScale, centerSpot }) {
                toScale = 1 / toScale;

                // 关注中心
                let x = centerSpot.pageX * canvas.pixelRatio - canvas.c.width / 2;
                let y = centerSpot.pageY * canvas.pixelRatio - canvas.c.height / 2 - canvas.lightTracksBarHeight * canvas.pixelRatio;

                canvas.baseX -= (x * (toScale - 1)) * canvas.scale * canvas.dp;
                canvas.baseY -= (y * (toScale - 1)) * canvas.scale * canvas.dp;

                canvas.scale *= toScale;
            }
        });
        gestures.startOnWebTouch(canvas.c, true);

    }


}


function editUniverse(data) {
    worker.postMessage({
        cmd: "update",
        data: data
    });
}

function degToRad(degrees) {
    return degrees * Math.PI / 180;
};