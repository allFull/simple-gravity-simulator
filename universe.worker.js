function sleep(t) {
    return new Promise(resolve => {
        setTimeout(resolve, t * 1000);
    });
}

function now() {
    return Date.now() / 1000;
}

const G = 6.67 * Math.pow(10, -11);

class Planet {
    id;
    m; // mass
    x;
    y;
    vx;
    vy;
    next = {};
    constructor(params) {
        Object.assign(this, params);
    }
}

class Space {
    time = 0;

    lastReportTime = 0;

    accuracy = 1 * (1 + Math.random() / 10); // 精度 单位秒
    timeMultiplier = 60 * 24 * 365 * 1; // 默认为 60*24*365 即1分钟为1年

    realTimeMultiplier = 60 * 24 * 365;

    planets = [];

    running = false;

    async run() {
        this.running = true;

        let lastRealTime = now(); // 上次的时间

        let tc = 0; // 连续超时次数，连续操作达到一定次数 进行一次 sleep(0) 临时中断 避免脚本无法响应

        while (this.running) {

            let stepsCount = Math.ceil(((now() - lastRealTime + (1 / 1000)) * this.timeMultiplier) / this.accuracy); // 现实时间 已经过去的加上多运行1毫秒
            for (let i = 0; i < stepsCount; i++) {
                this.step();
            }

            let timePassed = this.accuracy * stepsCount;

            let realTimePassed = now() - lastRealTime;

            if (timePassed / this.timeMultiplier < realTimePassed) {
                // 如果运行速度不够 不管了 获取到一个实时倍数即可
                this.realTimeMultiplier = timePassed / realTimePassed;
                lastRealTime = now();

                tc++;
                if (tc >= 10) {
                    await sleep(0);
                    tc = 0;
                }

            } else {
                this.realTimeMultiplier = this.timeMultiplier;
                lastRealTime = now();
                await sleep(timePassed / this.timeMultiplier - realTimePassed);
            }
        }
    }
    async pause() {
        this.running = false;
    }
    step() {
        const T = this.accuracy;
        for (let p of this.planets) {
            // 累计所有其他星球对它的加速度
            var ax = 0;
            var ay = 0;
            for (let o of this.planets) {
                if (o === p) continue;
                let dx = o.x - p.x;
                let dy = o.y - p.y;
                let r = Math.sqrt(dx * dx + dy * dy);
                ax += (G * o.m * dx) / (r * r * r);
                ay += (G * o.m * dy) / (r * r * r);
            }
            p.next = {};
            p.next.x = p.x + ((p.vx + ax * T + p.vx) / 2) * T;
            p.next.y = p.y + ((p.vy + ay * T + p.vy) / 2) * T;
            p.next.vx = p.vx + ax * T;
            p.next.vy = p.vy + ay * T;
        }
        for (let p of this.planets) {
            for (let name in p.next) {
                p[name] = p.next[name];
            }
        }
        this.time += T;

        // 按照现实时间1秒 x 次进行自动上报 
        if ((this.time - this.lastReportTime) >= Math.min((1 / 180) * this.timeMultiplier, (1 / 60) * this.realTimeMultiplier)) {
            report();
            this.lastReportTime = this.time;
        }

    }
}

const universe = new Space();

function report(runningStateChange = false) {
    // console.log('r');
    self.postMessage({
        type: "state",
        state: JSON.parse(JSON.stringify(universe)),
        runningStateChange
    });
}

self.onmessage = async ({ data }) => {
    if (data.cmd == "get-state") {
        report();
    } else if (data.cmd == "update") {
        Object.assign(universe, data.data);
    } else if (data.cmd == "knock") {
        self.postMessage({
            type: "knock"
        });
    } else if (data.cmd == "pause") {
        if (universe.running) {
            universe.pause();
            await sleep(0);
            report(true);
        }
    } else if (data.cmd == "run") {
        if (!universe.running) {
            universe.run();
            await sleep(0);
            report(true);
        }
    }
}