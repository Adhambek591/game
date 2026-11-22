# numpy texture helpers (run inside Blender's python)
import numpy as np

def value_noise(h, w, cells_y, cells_x, rng, tile_x=True):
    """smooth value noise, tileable horizontally"""
    g = rng.random((cells_y + 2, cells_x + (0 if tile_x else 1) + 1)).astype(np.float32)
    if tile_x:
        g = np.concatenate([g, g[:, :1]], axis=1)
    ys = np.linspace(0, cells_y, h, endpoint=False, dtype=np.float32)
    xs = np.linspace(0, cells_x, w, endpoint=False, dtype=np.float32)
    y0 = ys.astype(int); x0 = xs.astype(int)
    fy = ys - y0; fx = xs - x0
    fy = fy * fy * (3 - 2 * fy); fx = fx * fx * (3 - 2 * fx)
    a = g[y0][:, x0]; b = g[y0][:, x0 + 1]; c = g[y0 + 1][:, x0]; d = g[y0 + 1][:, x0 + 1]
    top = a + (b - a) * fx[None, :]; bot = c + (d - c) * fx[None, :]
    return top + (bot - top) * fy[:, None]

def fbm(h, w, base_y, base_x, octaves, rng, gain=0.5):
    out = np.zeros((h, w), np.float32); amp = 1.0; tot = 0.0
    for o in range(octaves):
        cy, cx = max(1, int(base_y * 2 ** o)), max(1, int(base_x * 2 ** o))
        out += value_noise(h, w, cy, cx, rng) * amp; tot += amp; amp *= gain
    return out / tot

def blur(a, sigma):
    """gaussian blur via FFT (wraps)"""
    h, w = a.shape
    fy = np.fft.fftfreq(h)[:, None]; fx = np.fft.rfftfreq(w)[None, :]
    k = np.exp(-2 * (np.pi ** 2) * (sigma ** 2) * (fx ** 2 + fy ** 2))
    return np.fft.irfft2(np.fft.rfft2(a) * k, s=a.shape).astype(np.float32)

def normal_from_height(hm, px_size_m, strength=1.0):
    """hm in metres; returns tangent-space normal (OpenGL, 0..1)"""
    gx = (np.roll(hm, -1, 1) - np.roll(hm, 1, 1)) / (2 * px_size_m)
    gy = (np.roll(hm, -1, 0) - np.roll(hm, 1, 0)) / (2 * px_size_m)
    gx *= strength; gy *= strength
    n = np.stack([-gx, -gy, np.ones_like(hm)], axis=2)
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5

def cavity_ao(hm, px_size_m, radius_px=6, depth=0.0012):
    b = blur(hm, radius_px)
    c = np.clip((hm - b) / depth, -1, 1)
    return np.clip(1.0 + np.minimum(c, 0) * 0.8, 0, 1)

def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)

def lerp(a, b, t):
    return a + (b - a) * t
