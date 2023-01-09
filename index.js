function roots_quadratic(a, b, c) {
    let delta = b * b - 4 * a * c;
    if (delta < 0) return [];

    let delta_root = Math.sqrt(delta);
    return [
        (-b - delta_root) / (2 * a),
        (-b + delta_root) / (2 * a),
    ];
}

class Parabola {
    a;
    b;
    c;
    constructor(a, b, c) {
        this.a = a;
        this.b = b;
        this.c = c;
    }

    roots_for(y) {
        return roots_quadratic(this.a, this.b, this.c - y);
    }

    roots() {
        return roots_quadratic(this.a, this.b, this.c);
    }

    at(x) {
        return x * x * this.a + x * this.b + this.c;
    }

    to_function() {
        return (x) => this.at(x);
    }

    vertex() {
        let x = -this.b / (2 * this.a);
        return [x, this.at(x)];
    }
};

var min_scale = 50.0;

class Graph {
    //offsets to graph to the edges of the canvas for drawing text
    xoffset = 45;
    yoffset = 20;

    constructor(ctx, xmax, ymax) {
        this.ctx = ctx;
        this.xmax = xmax;
        this.ymax = ymax;

        this.cheight = ctx.canvas.height;
        this.cwidth = ctx.canvas.width;

        this.gwidth = this.cwidth - this.xoffset;
        this.gheight = this.cheight - this.yoffset;

        //give some headroom with offsets
        let pheight = this.gheight - this.yoffset;
        let pwidth = this.gwidth - this.xoffset;

        let yscale = this.ymax / pheight;
        let xscale = this.xmax / pwidth;

        // pixel_pos * scale = pos
        // pos / scale = pixel_pos
        this.scale = Math.max(Math.max(yscale, xscale),min_scale / Math.max(pheight,pwidth));
    }

    //pixel to graph 
    to_graph_space(x, y) {
        return [
            (x - this.xoffset) * this.scale,
            (this.gheight - y) * this.scale,
        ];
    }

    //graph to pixel space relative to canvas
    to_pixel_space(x, y) {
        return [
            x / this.scale + this.xoffset,
            this.gheight - y / this.scale,
        ];
    }

    graph_function(f) {
        this.ctx.beginPath();
        //draw the graph lines
        this.ctx.moveTo(this.xoffset, this.cheight - this.yoffset);
        this.ctx.lineTo(this.cwidth, this.cheight - this.yoffset);
        this.ctx.moveTo(this.xoffset, this.cheight - this.yoffset);
        this.ctx.lineTo(this.xoffset, 0);

        //move back to 0,0 in graph space
        this.ctx.moveTo(this.xoffset, this.cheight - this.yoffset);

        for (let i = 0; i < this.xmax / this.scale; i++) {
            let gx = i * this.scale;
            let [px, py] = this.to_pixel_space(gx, f(gx));
            this.ctx.lineTo(px, py);
        }

        this.ctx.stroke();

        this.#draw_graph_numbers();
    }

    #draw_graph_numbers() {
        this.ctx.textAlign = "center"
        this.ctx.font = "16px serif";
        let horizontal_graph_text = (text, px) => {
            this.ctx.fillText(text, this.xoffset + px, this.cheight - 2);
        };

        let xend = this.gwidth * this.scale;
        let xstep = Math.ceil(xend / 100) * 10;

        for (let i = 0; i < 11; i++) {
            let x = xstep * i;

            if (x > this.xmax) {
                x = this.xmax;
                i = 1000000;//set i to big number to break after this iteration
            }

            horizontal_graph_text(x.toFixed(0).toString() + "m", x / this.scale);
        }

        this.ctx.textAlign = "right"
        let vertical_graph_text = (text, py) => {
            this.ctx.fillText(text, this.xoffset, this.gheight - py);
        };

        let yend = this.gheight * this.scale;
        let ystep = Math.ceil(yend / 100) * 10;

        for (let i = 1; i < 11; i++) {
            let y = ystep * i;

            if (y > this.ymax) {
                y = this.ymax;
                i = 1000000;//set i to big number to break after this iteration
            }

            vertical_graph_text(y.toFixed(0).toString() + "m", y / this.scale);
        }
    }
}

function graph_function(ctx, f, xmax, ymax) {
    let graph = new Graph(ctx, xmax, ymax);
    graph.graph_function(f);

    return graph;
    // return (x, y) => graph.to_pixel_space(x, y);
}

function graph_parabola(ctx, parabola) {
    if (parabola.a >= 0) return;

    let base_height = parabola.c;

    //get the y component of the vertex as the max height
    let [midx, ymax] = parabola.vertex();

    //get roots
    let [x1, x2] = parabola.roots();

    //use the biggest root as xmax
    let xmax = Math.max(x1, x2);

    //biggest root must be bigger than zero
    if (xmax < 0) return;

    return graph_function(ctx, parabola.to_function(), xmax, ymax);
}

let canvas = document.getElementById("cv");
let ctx = canvas.getContext("2d");

function fill_circle(x, y, r) {
    //preserve the oldstyle
    let oldstyle = ctx.fillStyle;

    ctx.fillStyle = "#FF00FF";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = oldstyle;
}

function sleep(ms) {
    return new Promise(reroots => setTimeout(reroots, ms));
}

class Simulation {
    constructor(frame, delta_t, t_end) {
        this.frame = frame;
        this.delta_t = delta_t;
        this.t_end = t_end;
        this.t = 0.0;
        this.running = false;
    }

    async start() {
        if (this.running) return;//return if it is already started

        this.running = true;
        while (this.t < this.t_end) {
            this.frame(this.t);
            this.t += this.delta_t;
            await sleep(this.delta_t);
            if (!this.running) return;
        }

        this.frame(this.t_end);//do the last frame
        this.t = 0;
    }

    pause() {
        this.running = false;
    }

    pause_play() {
        if (this.running) {
            this.running = false;
        } else {
            this.start();
        }
    }

    stop() {
        this.running = false;
        this.t = 0;
    }

    draw() {
        this.frame(this.t);
    }
}

var graph = null;

function simulate_horizontal_throw(vx, vy, g, h) {
    let yt_parabola = new Parabola(-g / 2, vy, h);//-g/2*t^2 + t*vy + h
    let yx_parabola = new Parabola(-g / (2 * vx * vx), vy / vx, h);

    function ball_position_at_t(t) {
        return [vx * t, yt_parabola.at(t)]
    }

    function frame(t) {
        //clear canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

        graph = graph_parabola(ctx, yx_parabola);

        let [bx, by] = ball_position_at_t(t);
        let [px, py] = graph.to_pixel_space(bx, by);

        fill_circle(px, py, 15);

        let width = ctx.canvas.width;

        //timers and ball positions

        ctx.fillText(`t: ${t.toFixed(2)}s`, width - 20, 20);
        ctx.fillText(`x: ${bx.toFixed(1)}m`, width - 20, 40);
        ctx.fillText(`y: ${by.toFixed(1)}m`, width - 20, 60);
    }

    let [t1, t2] = yt_parabola.roots();

    let t_end = Math.max(t1, t2);

    frame(1);

    // frame time
    let delta_t = 1.0 / 60;

    return new Simulation(frame, delta_t, t_end);
}

// simulate_horizontal_throw(50, 40, 10, 20);

function radians(degree) {
    return degree * (Math.PI / 180);
}

function degrees(radians) {
    return radians * (180 / Math.PI);

}

var velocity = 10;
var angle = 45;
var gravity = 10;
var velocity_x = 10;
var velocity_y = 10;
var time = 0.0;
var height = 0.0;

var simulation = null;

function update_simulation() {
    if (simulation != null) {
        simulation.stop();
    }
    simulation = simulate_horizontal_throw(velocity_x, velocity_y, gravity, height);
    let frame = simulation.frame;
    simulation.frame = (t) => { //override frame
        time = t.toFixed(2);
        document.getElementById("time").value = time;
        frame(t);
    };
    simulation.frame(0);
}


function update_value(name, value_raw) {
    let value = Number(value_raw);
    window[name] = value;
    document.getElementById(name).value = value.toString();
    return value;
}

function update_velocity() {
    let angle_rad = radians(angle);
    velocity_x = Math.cos(angle_rad) * velocity;
    velocity_y = Math.sin(angle_rad) * velocity;
    document.getElementById("velocity_x").value = velocity_x.toFixed(1).toString();
    document.getElementById("velocity_y").value = velocity_y.toFixed(1).toString();
    update_simulation();
}

function update_velocity_from_components() {
    let angle_rad = Math.atan(velocity_y / velocity_x);
    angle = degrees(angle_rad);
    velocity = Math.sqrt(velocity_x * velocity_x + velocity_y * velocity_y);
    document.getElementById("velocity").value = velocity.toFixed(1).toString();
    document.getElementById("angle_value").value = angle.toFixed(1).toString();
    update_simulation();
}

update_velocity();
update_simulation();

var mouseDown = 0;
document.body.onmousedown = function () {
    ++mouseDown;
}
document.body.onmouseup = function () {
    --mouseDown;
}

canvas.addEventListener("mousemove", (e) => {
    if (mouseDown == 0) return;
    if (simulation.running) simulation.stop();


    // Get the target
    const target = e.target;

    // Get the bounding rectangle of target
    const rect = target.getBoundingClientRect();

    // Mouse position
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let [gx, gy] = graph.to_graph_space(x, y);

    //clamp the x and divide by velocity to get time
    simulation.t = time = Math.min(Math.max(gx, 0), graph.xmax) / velocity_x;
    simulation.draw();

});