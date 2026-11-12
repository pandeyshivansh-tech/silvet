"""Read simple TrueType glyphs without installing a font-processing dependency.

Used only to outline the Instrument Serif wordmark in these design proofs.
The three Selvedge symbols are independently drawn, not font glyphs.
"""
import struct


class TrueType:
    def __init__(self, data):
        self.data = data
        self.tables = {}
        for i in range(self.u16(4)):
            pos = 12 + i * 16
            tag = data[pos:pos + 4].decode("ascii")
            self.tables[tag] = self.u32(pos + 8)
        self.units = self.u16(self.tables["head"] + 18)
        self.long_loca = self.i16(self.tables["head"] + 50) == 1
        self.metric_count = self.u16(self.tables["hhea"] + 34)

    def u16(self, pos):
        return struct.unpack_from(">H", self.data, pos)[0]

    def i16(self, pos):
        return struct.unpack_from(">h", self.data, pos)[0]

    def u32(self, pos):
        return struct.unpack_from(">I", self.data, pos)[0]

    def glyph_id(self, char):
        cmap = self.tables["cmap"]
        for i in range(self.u16(cmap + 2)):
            rec = cmap + 4 + i * 8
            sub = cmap + self.u32(rec + 4)
            fmt = self.u16(sub)
            if fmt == 4:
                count = self.u16(sub + 6) // 2
                ends = sub + 14
                starts = ends + count * 2 + 2
                deltas = starts + count * 2
                ranges = deltas + count * 2
                code = ord(char)
                for j in range(count):
                    if self.u16(starts + j * 2) <= code <= self.u16(ends + j * 2):
                        delta = self.i16(deltas + j * 2)
                        off = self.u16(ranges + j * 2)
                        if not off:
                            return (code + delta) & 65535
                        at = ranges + j * 2 + off + 2 * (code - self.u16(starts + j * 2))
                        glyph = self.u16(at)
                        return (glyph + delta) & 65535 if glyph else 0
        raise ValueError(f"No supported cmap entry for {char}")

    def outline(self, char):
        glyph = self.glyph_id(char)
        loca = self.tables["loca"]
        offset = self.u32(loca + glyph * 4) if self.long_loca else self.u16(loca + glyph * 2) * 2
        pos = self.tables["glyf"] + offset
        contours = self.i16(pos)
        if contours <= 0:
            raise ValueError(f"Expected a simple nonempty glyph for {char}")
        bbox = [self.i16(pos + 2 + i * 2) for i in range(4)]
        ends = [self.u16(pos + 10 + i * 2) for i in range(contours)]
        cursor = pos + 10 + contours * 2
        cursor += 2 + self.u16(cursor)
        flags = []
        while len(flags) <= ends[-1]:
            flag = self.data[cursor]
            cursor += 1
            flags.append(flag)
            if flag & 8:
                flags.extend([flag] * self.data[cursor])
                cursor += 1
        coordinates = []
        for short, same in [(2, 16), (4, 32)]:
            values, value = [], 0
            for flag in flags:
                if flag & short:
                    delta = self.data[cursor] * (1 if flag & same else -1)
                    cursor += 1
                elif flag & same:
                    delta = 0
                else:
                    delta = self.i16(cursor)
                    cursor += 2
                value += delta
                values.append(value)
            coordinates.append(values)
        points = [(coordinates[0][i], coordinates[1][i], bool(f & 1)) for i, f in enumerate(flags)]
        paths = []
        start = 0
        fmt = lambda n: f"{n:g}"
        for end in ends:
            contour = points[start:end + 1]
            start = end + 1
            if contour[0][2]:
                origin, rest = contour[0], contour[1:]
            elif contour[-1][2]:
                origin, rest = contour[-1], contour[:-1]
            else:
                origin = ((contour[0][0] + contour[-1][0]) / 2,
                          (contour[0][1] + contour[-1][1]) / 2, True)
                rest = contour
            path = f"M{fmt(origin[0])} {fmt(origin[1])}"
            rest = rest + [origin]
            i = 0
            while i < len(rest):
                point = rest[i]
                if point[2]:
                    path += f"L{fmt(point[0])} {fmt(point[1])}"
                    i += 1
                else:
                    following = rest[i + 1]
                    if following[2]:
                        target = following
                        i += 2
                    else:
                        target = ((point[0] + following[0]) / 2, (point[1] + following[1]) / 2)
                        i += 1
                    path += f"Q{fmt(point[0])} {fmt(point[1])} {fmt(target[0])} {fmt(target[1])}"
            paths.append(path + "Z")
        advance = self.u16(self.tables["hmtx"] + min(glyph, self.metric_count - 1) * 4)
        return "".join(paths), bbox, advance

    def wordmark(self):
        # Optical spacing, rather than the application's uniform 0.22em tracking.
        gaps = [0, .15, .17, .115, .11, .135]
        glyphs = [self.outline(c) for c in "SILVET"]
        top = max(g[1][3] for g in glyphs)
        bottom = min(g[1][1] for g in glyphs)
        x, groups = 0, []
        first_bearing = glyphs[0][1][0]
        for index, (path, bbox, advance) in enumerate(glyphs):
            x += gaps[index] * self.units
            groups.append(f'<path transform="translate({x - first_bearing:g} {top}) scale(1 -1)" d="{path}"/>')
            right = x - first_bearing + bbox[2]
            x += advance
        return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {right:g} {top-bottom:g}" '
                'fill="currentColor" role="img" aria-label="SILVET">'
                + "".join(groups) + "</svg>")
