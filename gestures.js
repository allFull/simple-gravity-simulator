function getCenterOf(...spots) {
    let x = spots.reduce((total, { x }) => total + x, 0) / spots.length;
    let y = spots.reduce((total, { y }) => total + y, 0) / spots.length;
    return { x, y };
}

function getDistanceBetween(a, b) {
    return Math.sqrt(Math.pow((a.x - b.x), 2) + Math.pow((a.y - b.y), 2));
}

function toXY(t) {
    return {
        x: t.pageX,
        y: t.pageY
    };
}

function transformEventOnWeb(e) {
    return { ...e, touches: Array.from(e.touches) };
}

class Gestures {
    constructor({
        click = () => { },
        dbClick = () => { },
        tpClick = () => { },
        multiClick = () => { },
        hold = () => { },
        pinch = () => { },
        drag = () => { },
        release = () => { },
        // 一些开关
        clickOnly = false, // 只监听点击事件 表示即使有拖拽也触发
        listenMultiClick = true, // 监听多击事件 包括双击
        maximumMultiClickCount = 2, // 最大触发多次点击的个数 比如 2 就是只触发双击 会在双击检测到后立马触发 需要监听多次就设置为相应值
        multiClickInterTime = 200, // 多次点击时间间隔
        dragStartDistance = 5, // 移动超过多少开始算为拖拽 保护点击等操作
        dragNeedFingersMatch = n => n > 0, // 触发 drag的手指数量 一个函数 传入当前数量 返回是否满足


        // 事件
        onTouchStart = () => { }
    }) {
        Object.assign(this, {
            click, dbClick, tpClick, multiClick, hold, pinch, drag, release, dragNeedFingersMatch,
            clickOnly, dragStartDistance, listenMultiClick, multiClickInterTime, maximumMultiClickCount,
            onTouchStart,
        });
    }

    clickStack = []; // 点击栈

    single = true;
    startTime = null;

    dragged = false; // 被拖动过

    touchStartSpot = null;
    baseMoveSpot = null; // 用于拖动的关键移动点

    baseScaleDistance = null;

    nGestureData = null; // 供外部使用 会在每个新手势后重置 只保留当前手势周期

    // 记录触摸点数量 来实现添加或减少手指的监听
    touchesCount = null;
    // start 和 move 事件 会触发 触发会先于其他操作 （写在了onresponder 顶端）
    onTouchEvents(e) {
        // 实现 手指数变化的监听
        if (e.touches.length !== this.touchesCount) {
            this.touchesCount = e.touches.length;
            this.onTouchesCountChange(e);
        }
    }
    onTouchesCountChange(e) {
        // 每次加入或减少手指都重新设置 moveBase 避免瞬移
        this.baseMoveSpot = getCenterOf(...e.touches.map(toXY));

        // 每次加入或减少手指都重新设置 缩放相关
        if (e.touches.length > 1) {
            this.baseScaleDistance = getDistanceBetween(...e.touches.map(toXY).slice(0, 2)); // 只要前面两个点就好
            // this.scaleBaseSpot = getCenterOf(...e.touches.map(toXY).slice(0, 2))
        } else {
            this.baseScaleDistance = null;
        }
    }

    blockNative = true;
    panMoveShould = true;
    panStartShould = true;

    eventsListeners = {
        onPanResponderStart: (e) => {

            // console.log("start");

            this.onTouchEvents(e);

            // console.log("start",gestureState.numberActiveTouches );

            if (e.touches.length === 1) {

                // 触摸从头开始
                this.single = true;
                this.dragged = false;
                this.startTime = Date.now();

                this.touchStartSpot = toXY(e.touches[0]);

                this.onTouchStart();

                this.nGestureData = null;


                // 长按相关功能
                // 暂未添加

            }

            if (e.touches.length > 1) this.single = false;

        },
        onPanResponderMove: (e) => {

            this.onTouchEvents(e);

            // 只监听鼠标的话就不执行这些关于移动和缩放的函数
            if (this.clickOnly) return;

            // 保护点击操作
            if (this.single) {
                let nSpot = toXY(e.touches[0]);
                if (getDistanceBetween(nSpot, this.touchStartSpot) < this.dragStartDistance) {
                    // 拖拽未开始 只设置位置 并 返回
                    this.baseMoveSpot = nSpot;
                    return;
                }
            }


            this.dragged = true;

            {
                // 缩放先于移动触发 因为有个 centerSpot 拖拽后不好参考
                if (e.touches.length > 1) {
                    // 缩放功能
                    let nScaleDistance = getDistanceBetween(...e.touches.map(toXY).slice(0, 2));
                    let nCenterSpot = getCenterOf(...e.touches.map(toXY).slice(0, 2));
                    this.pinch({
                        scale: nScaleDistance / this.baseScaleDistance,
                        centerSpot: {
                            pageX: nCenterSpot.x,
                            pageY: nCenterSpot.y
                        }
                    });
                    // 记录当前距离
                    this.baseScaleDistance = nScaleDistance;
                } else {
                    // 每次手指数变化后都会重新记录
                    // 所以这里不用再记录
                }
            }

            {
                // 拖拽功能 drag
                let nMoveSpot = getCenterOf(...e.touches.map(toXY));
                // 触发拖拽
                if (Date.now() - this.startTime < 20) {
                    // 通过时间限制屏蔽前20毫秒的移动 防止刚进入滑动时手指过快 画面闪烁
                } else if (this.dragNeedFingersMatch ? this.dragNeedFingersMatch(e.touches.length) : true) {
                    this.drag({
                        dx: nMoveSpot.x - this.baseMoveSpot.x,
                        dy: nMoveSpot.y - this.baseMoveSpot.y
                    }, e);
                }
                // 记录当前关键位置
                // 不论如何每次结束都要记录 避免下一次使用旧数据引起漂移
                this.baseMoveSpot = nMoveSpot;
            }

        },
        onPanResponderRelease: (e) => {

            {

                // 制造click事件
                let { single, dragged, clickOnly, multiClickInterTime, listenMultiClick } = this;

                // console.log({ single, dragged });

                if (single && (clickOnly ? true : (!dragged))) {

                    let triggerClickTimeOut;

                    if (listenMultiClick) {

                        // 所有已经触发的都会立刻被从栈中清掉

                        // 清空栈中仍然在的定时器 （）
                        for (let old of this.clickStack) {
                            clearTimeout(old.clickEventTimeOut);
                        }


                        let trigger = (count) => {
                            switch (count) {
                                case 1:
                                    this.click(e);
                                    break;
                                case 2:
                                    this.dbClick(e);
                                    break;
                                case 3:
                                    this.tpClick(e);
                                    break;
                            }
                            this.multiClick(e, count);
                            this.clickStack.length = 0;
                        }

                        if (this.clickStack.length >= this.maximumMultiClickCount - 1) {
                            // 达到了最高点击次数情况 节省触发事件 不会再等一个定时器
                            trigger(this.maximumMultiClickCount);
                            this.clickStack.length = 0;
                        } else {
                            // 设置这一个定时器
                            triggerClickTimeOut = setTimeout(() => {
                                trigger(this.clickStack.length);
                            }, multiClickInterTime);

                            // 放入栈中
                            this.clickStack.push({
                                t: Date.now(),
                                clickEventTimeOut: triggerClickTimeOut
                            });
                        }



                    } else {
                        this.click(e);
                    }


                } else {
                    // 不是点击 清空点击栈 没有用了
                    this.clickStack.length = 0;
                }

            }

            // 传入松手相关
            if (this.dragged) {
                this.release(e);
            }


        },
    };
    startOnWebTouch(target, preventDefault = false) {
        target.addEventListener("touchstart", (e) => {
            if (preventDefault) e.preventDefault();
            this.eventsListeners.onPanResponderStart(transformEventOnWeb(e));
        });
        target.addEventListener("touchmove", (e) => {
            if (preventDefault) e.preventDefault();
            this.eventsListeners.onPanResponderMove(transformEventOnWeb(e));
        });
        target.addEventListener("touchend", (e) => {
            if (preventDefault) e.preventDefault();
            this.eventsListeners.onPanResponderRelease(transformEventOnWeb(e));
        });
    }
}