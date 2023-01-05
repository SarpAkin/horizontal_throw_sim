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

function graph_function(ctx, f, xmax, ymax) {
    let cheight = ctx.canvas.height;
    let cwidth = ctx.canvas.width;

    //offsets to graph to the edges of the canvas for drawing text
    let xoffset = 45;
    let yoffset = 20;

    let gwidth = cwidth - xoffset;
    let gheight = cheight - yoffset;

    //give some headroom with offsets
    let yscale = ymax / (gheight - yoffset);
    let xscale = xmax / (gwidth - xoffset);
    let scale = Math.max(yscale, xscale);
    let inv_scale = 1.0 / scale;

    ctx.beginPath();
    ctx.moveTo(xoffset, cheight - yoffset);
    ctx.lineTo(cwidth, cheight - yoffset);
    ctx.moveTo(xoffset, cheight - yoffset);
    ctx.lineTo(xoffset, 0);

    ctx.moveTo(xoffset, cheight - yoffset);

    // pixel_pos * scale = pos
    // pos / scale = pixel_pos

    for (i = 0; i < xmax / scale; i++) {
        ctx.lineTo(i + xoffset, gheight - f(i * scale) * inv_scale);
    }

    ctx.stroke();

    ctx.textAlign = "center"
    ctx.font = "16px serif";
    function horizontal_graph_text(text, px) {
        ctx.fillText(text, xoffset + px, cheight - 2);

    }

    let xend = gwidth * scale;
    let xstep = Math.ceil(xend / 100) * 10;

    for (i = 0; i < 11; i++) {
        let x = xstep * i;

        if (x > xmax) {
            x = xmax;
            i = 1000000;//set i to big number to break after this iteration
        }

        horizontal_graph_text(x.toFixed(0).toString() + "m", x / scale);
    }

    ctx.textAlign = "right"
    function vertical_graph_text(text, py) {
        ctx.fillText(text, xoffset, gheight - py);
    }

    let yend = gheight * scale;
    let ystep = Math.ceil(yend / 100) * 10;

    for (i = 1; i < 11; i++) {
        let y = ystep * i;

        if (y > ymax) {
            y = ymax;
            i = 1000000;//set i to big number to break after this iteration
        }

        vertical_graph_text(y.toFixed(0).toString() + "m", y / scale);
    }

    function world_pos_to_graph_pos(wx, wy) {
        return [xoffset + wx / scale, gheight - wy / scale];
    }

    return world_pos_to_graph_pos;
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
}

function simulate_horizontal_throw(vx, vy, g, h) {
    let yt_parabola = new Parabola(-g / 2, vy, h);//-g/2*t^2 + t*vy + h
    let yx_parabola = new Parabola(-g / (2 * vx * vx), vy / vx, h);

    function ball_position_at_t(t) {
        return [vx * t, yt_parabola.at(t)]
    }

    function frame(t) {
        //clear canvas
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)

        let world_pos_to_graph_pos = graph_parabola(ctx, yx_parabola);

        let [bx, by] = ball_position_at_t(t);
        let [px, py] = world_pos_to_graph_pos(bx, by);

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

var simulation = null;

function update_simulation() {
    if (simulation != null) {
        simulation.stop();
    }
    simulation = simulate_horizontal_throw(velocity_x, velocity_y, gravity, 0);
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