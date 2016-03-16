'use strict'
class fade {
	HSV(f, t, l, fps, func) {
		console.log(f);
		console.log(t);
		if ((f[0] === 0 && f[1] === 0 && f[2] === 0) || (t[0] === 0 && t[1] === 0 && t[2] === 0)) {
			//console.log('Passing to RGB fader for better color representation')
			this.RGB(HSVtoRGB(...f), HSVtoRGB(...t), l, fps, func);
			return;
		}

		var steps = fps*l/1000;
		
		var hstep = Math.round((t[0]-f[0])/steps);
		if (Math.round((f[0]-t[0])/steps) > hstep) {
			hstep = -Math.round((f[0]-t[0])/steps)
		}
		var sstep = Math[(t[1]-f[1])>=0?'ceil':'floor']((t[1]-f[1])/steps);
		var vstep = Math[(t[2]-f[2])>=0?'ceil':'floor']((t[2]-f[2])/steps);
		
		var stepscompleted = 0;
		
		var interval = setInterval(function(){
			stepscompleted++;
			let h = f[0]+hstep*stepscompleted;
			if (h > 360) {
				h-=360;
			}
			if (h < 0) {
				h+=360;
			}
			let s = Math.max(Math.min(f[1]+sstep*stepscompleted, 100), 0);
			let v = Math.max(Math.min(f[2]+vstep*stepscompleted, 100), 0);
			func(h, s, v);
			if (stepscompleted>=steps) {
				var timeleft = Math.round(t/fps)*stepscompleted;
				if (timeleft/fps>1) {
					fadeColor([f[0]+hstep[0]*stepscompleted, f[1]+sstep[1]*stepscompleted, f[2]+vstep[2]*stepscompleted], timeleft, l, fps, func)
				}
				clearInterval(interval);
				return;
			}
		}, Math.round(1000/fps));
	}
	RGB(f, t, l, fps, func) {
		var steps = fps*l/1000;
		var rstep = Math[(t[0]-f[0])>=0?'ceil':'floor']((t[0]-f[0])/steps);
		var gstep = Math[(t[1]-f[1])>=0?'ceil':'floor']((t[1]-f[1])/steps);
		var bstep = Math[(t[2]-f[2])>=0?'ceil':'floor']((t[2]-f[2])/steps);
		
		var stepscompleted = 0;
		
		var interval = setInterval(function(){
			stepscompleted++;
			let r = Math.max(Math.min(f[0]+rstep*stepscompleted, 255), 0);
			let g = Math.max(Math.min(f[1]+gstep*stepscompleted, 255), 0);
			let b = Math.max(Math.min(f[2]+bstep*stepscompleted, 255), 0);
			func(...RGBtoHSV(r, g, b));
			if (stepscompleted>=steps) {
				var timeleft = Math.round(t/fps)*stepscompleted;
				if (timeleft/fps>=1) {
					fadeColor([f[0]+rstep[0]*stepscompleted, f[1]+rstep[1]*stepscompleted, f[2]+rstep[2]*stepscompleted], timeleft, l, fps, func)
				}
				clearInterval(interval);
				return;
			}
		}, Math.round(1000/fps));
	}
	Wheel(f, t, l, fps, func) {
		f = RGBtoHSV(...f);
		t = RGBtoHSV(...t);
		this.HSV(f, t, l, fps, function(h, s, v) {
			func(...HSVtoRGB(h, s, v));
		})
	}
}

function RGBtoHSV(r, g, b) {
    if (arguments.length === 1) {
        g = r.g, b = r.b, r = r.r;
    }
    var max = Math.max(r, g, b), min = Math.min(r, g, b),
        d = max - min,
        h,
        s = (max === 0 ? 0 : d / max),
        v = max / 255;

    switch (max) {
        case min: h = 0; break;
        case r: h = (g - b) + d * (g < b ? 6: 0); h /= 6 * d; break;
        case g: h = (b - r) + d * 2; h /= 6 * d; break;
        case b: h = (r - g) + d * 4; h /= 6 * d; break;
    }

    return [
		Math.round(h*360),
        Math.round(s*100),
        Math.round(v*100)
    ];
}

function HSVtoRGB(h, s, v) {
	h/=360;
	s/=100;
	v/=100;
    var r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
    }
    return [
		Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}

module.exports = {fade};