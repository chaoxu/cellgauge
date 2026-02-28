const test = require("node:test");
const assert = require("node:assert/strict");

test("font generator codepoints include expected chart glyph entries", () => {
  const config = require("../scripts/font/fantasticon.config.js");
  const codepoints = config.codepoints;

  assert.equal(typeof codepoints, "object");
  assert.equal(Object.keys(codepoints).length, 11900);
  assert.equal(codepoints.bar2_gfn_m_80, 0x76ed);
  assert.equal(codepoints.bar2_ghn_m_80, 0x75a9);
  assert.equal(codepoints.bar3_ghb_l_000, 0x1000);
  assert.equal(codepoints.bar1_nfn_s_08, undefined);
  assert.equal(codepoints.bar1_nfn_s_00, undefined);
  assert.equal(codepoints.bar2_ghn_m_00, undefined);
  assert.equal(codepoints.bar3_nfn_r_000, undefined);
  assert.equal(codepoints.donut2_hn_l_00, undefined);
  assert.equal(codepoints.bar1_nfn_s_16, undefined);
  assert.equal(codepoints.donut2_fn_r_32, 0x7f27);

  // 1-lane gapped styles are unreachable in runtime and are fully pruned.
  assert.equal(codepoints.bar1_ghb_l_00, undefined);
  assert.equal(codepoints.bar1_ghb_m_00, undefined);

  // dedup boundary (bordered, 1-lane, no-gap): l/s kept at 0 only.
  assert.equal(codepoints.bar1_nhb_l_00, 0x7b48);
  assert.equal(codepoints.bar1_nhb_s_00, 0x7b63);
  assert.equal(codepoints.bar1_nhb_l_01, undefined);
  assert.equal(codepoints.bar1_nhb_s_01, undefined);

  // no-border bars keep only m variant (except empty, which is space at runtime).
  assert.equal(codepoints.bar1_nhn_m_01, 0x7be2);
  assert.equal(codepoints.bar1_nhn_r_01, undefined);

  // multi-lane dedup: bordered l kept when any lane is 0
  assert.equal(codepoints.bar2_ghb_l_01, 0x7001);
  assert.equal(codepoints.bar2_ghb_l_10, 0x7009);
  // multi-lane dedup: bordered l removed when all lanes > 0
  assert.equal(codepoints.bar2_ghb_l_11, undefined);
  // multi-lane dedup: no-border l always removed
  assert.equal(codepoints.bar2_ghn_l_11, undefined);
  assert.equal(codepoints.bar2_ghn_l_01, undefined);
});
