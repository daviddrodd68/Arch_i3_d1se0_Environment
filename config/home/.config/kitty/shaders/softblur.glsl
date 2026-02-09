vec4 main(vec2 pos) {
    vec2 px = vec2(0.006, 0.006); // RADIO GIGANTE

    vec4 blur = vec4(0.0);

    blur += texture2D(texture, pos);
    blur += texture2D(texture, pos + px);
    blur += texture2D(texture, pos - px);
    blur += texture2D(texture, pos + vec2(px.x, -px.y));
    blur += texture2D(texture, pos + vec2(-px.x, px.y));

    blur += texture2D(texture, pos + px * 2.0);
    blur += texture2D(texture, pos - px * 2.0);
    blur += texture2D(texture, pos + px * 3.0);
    blur += texture2D(texture, pos - px * 3.0);

    blur /= 9.0;

    // FUERZA TOTAL
    return mix(texture2D(texture, pos), blur, 0.9);
}
