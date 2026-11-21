// Ground of the browser build ported to URP (env.js roadify): PBR mud/ash with world-space UVs, a darker play lane, and a
// meandering packed-earth trail with wheel ruts, hoof and foot prints from the trail detail map, plus large-scale tint patches.
Shader "QQ/Ground"
{
    Properties
    {
        _BaseMap ("Albedo", 2D) = "white" {}
        _BumpMap ("Normal", 2D) = "bump" {}
        _TrailMap ("Trail detail (mean 0.5)", 2D) = "gray" {}
        _Tint ("Tint", Color) = (1,1,1,1)
        _RoadTint ("Trail tint", Color) = (0.42,0.345,0.25,1)
        _Tile ("Tile (m)", Float) = 7
        _Road ("Trail amp, half width, strength, x offset", Vector) = (1.6, 2.5, 1, 0)
        _Lane ("Lane half width, dark, desat, flat", Vector) = (12.5, 0.85, 0.85, 0.25)
        _BumpScale ("Normal strength", Float) = 1.3
        _Smooth ("Smoothness", Float) = 0.08
    }
    SubShader
    {
        Tags { "RenderType"="Opaque" "RenderPipeline"="UniversalPipeline" "Queue"="Geometry" }
        Pass
        {
            Name "ForwardLit"
            Tags { "LightMode"="UniversalForward" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE _MAIN_LIGHT_SHADOWS_SCREEN
            #pragma multi_compile _ _ADDITIONAL_LIGHTS_VERTEX _ADDITIONAL_LIGHTS
            #pragma multi_compile_fragment _ _SHADOWS_SOFT _SHADOWS_SOFT_LOW _SHADOWS_SOFT_MEDIUM _SHADOWS_SOFT_HIGH
            #pragma multi_compile_fragment _ _ADDITIONAL_LIGHT_SHADOWS
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"

            TEXTURE2D(_BaseMap); SAMPLER(sampler_BaseMap);
            TEXTURE2D(_BumpMap); SAMPLER(sampler_BumpMap);
            TEXTURE2D(_TrailMap); SAMPLER(sampler_TrailMap);
            CBUFFER_START(UnityPerMaterial)
                float4 _BaseMap_ST; half4 _Tint; half4 _RoadTint; float _Tile; float4 _Road; float4 _Lane; half _BumpScale; half _Smooth;
            CBUFFER_END

            struct A { float4 pos : POSITION; float3 n : NORMAL; float4 t : TANGENT; };
            struct V { float4 cs : SV_POSITION; float3 ws : TEXCOORD0; half3 n : TEXCOORD1; half4 t : TEXCOORD2; half fog : TEXCOORD3; };

            V vert(A i)
            {
                V o; VertexPositionInputs p = GetVertexPositionInputs(i.pos.xyz); VertexNormalInputs nn = GetVertexNormalInputs(i.n, i.t);
                o.cs = p.positionCS; o.ws = p.positionWS; o.n = nn.normalWS; o.t = half4(nn.tangentWS, i.t.w * GetOddNegativeScale()); o.fog = ComputeFogFactor(p.positionCS.z);
                return o;
            }

            half4 frag(V i) : SV_Target
            {
                float2 P = i.ws.xz, uv = P / _Tile;
                half3 col = SAMPLE_TEXTURE2D(_BaseMap, sampler_BaseMap, uv).rgb * _Tint.rgb;
                half3 nts = UnpackNormalScale(SAMPLE_TEXTURE2D(_BumpMap, sampler_BumpMap, uv), _BumpScale);
                // play lane: darker, a little desaturated, flatter
                half lane = 1 - smoothstep(_Lane.x, _Lane.x + 6, abs(P.x));
                half l0 = dot(col, half3(.299, .587, .114));
                half3 lc = lerp(l0.xxx, col, _Lane.z) * lerp(1, .4 / max(l0, .1), _Lane.w) * _Lane.y;
                col = lerp(col, lc, lane);
                // trail along z (rotate the arena so z runs to the enemy camp)
                float cx = sin(P.y * .045) * _Road.x + sin(P.y * .11 + 1.3) * _Road.x * .35 + _Road.w, dx = P.x - cx;
                half3 rt = SAMPLE_TEXTURE2D(_TrailMap, sampler_TrailMap, float2(dx / (_Road.y * 2.9) + .5, P.y / 11)).rgb;
                half wob = SAMPLE_TEXTURE2D(_TrailMap, sampler_TrailMap, float2(.08, P.y / 47)).g + SAMPLE_TEXTURE2D(_TrailMap, sampler_TrailMap, float2(.9, P.y / 23)).g - 1;
                half hw = _Road.y * (1 + wob * .5);
                half road = (1 - smoothstep(hw * .55, hw * 1.3, abs(dx))) * _Road.z;
                half l1 = dot(col, half3(.299, .587, .114));
                half3 rc = lerp(col, _RoadTint.rgb * (.75 + l1 * .6), .72) * (.2 + rt * 1.3) * .7;
                col = lerp(col, rc, road);
                // large-scale variation so the ground never repeats visibly
                half mv = SAMPLE_TEXTURE2D(_TrailMap, sampler_TrailMap, P * .021).g * .6 + SAMPLE_TEXTURE2D(_TrailMap, sampler_TrailMap, P.yx * .067 + .3).r * .4;
                col *= .78 + mv * .44;
                half pv = SAMPLE_TEXTURE2D(_TrailMap, sampler_TrailMap, P * .0063 + .17).b + SAMPLE_TEXTURE2D(_TrailMap, sampler_TrailMap, P.yx * .0131 + .41).r * .5;
                col *= lerp(half3(1.08, 1, .88), half3(.88, 1.03, .96), smoothstep(.55, .95, pv));
                nts = normalize(lerp(nts, half3(0, 0, 1), saturate(lane * _Lane.w * .6 + road * .3)));

                half3 bit = i.t.w * cross(i.n, i.t.xyz);
                half3 nws = normalize(TransformTangentToWorld(nts, half3x3(i.t.xyz, bit, i.n)));
                InputData d = (InputData)0; d.positionWS = i.ws; d.normalWS = nws; d.viewDirectionWS = GetWorldSpaceNormalizeViewDir(i.ws);
                d.shadowCoord = TransformWorldToShadowCoord(i.ws); d.fogCoord = i.fog; d.bakedGI = SampleSH(nws); d.normalizedScreenSpaceUV = GetNormalizedScreenSpaceUV(i.cs); d.shadowMask = half4(1, 1, 1, 1);
                SurfaceData s = (SurfaceData)0; s.albedo = col; s.metallic = 0; s.smoothness = lerp(_Smooth, 0, saturate(lane * .85 + road)); s.normalTS = nts; s.occlusion = 1; s.alpha = 1;
                half4 c = UniversalFragmentPBR(d, s); c.rgb = MixFog(c.rgb, i.fog); return c;
            }
            ENDHLSL
        }
    }
    FallBack "Universal Render Pipeline/Lit"
}
