const test = require("node:test");
const assert = require("node:assert/strict");

test("font generator codepoints include expected chart glyph entries", () => {
  const config = require("../scripts/font/fantasticon.config.js");
  const codepoints = config.codepoints;

  assert.equal(typeof codepoints, "object");
  assert.equal(Object.keys(codepoints).length, 15220);
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

  // dedup boundary: bordered l/s kept at level 0 (left border visible)
  assert.equal(codepoints.bar1_ghb_l_00, 0x7b00);
  assert.equal(codepoints.bar1_ghb_s_00, 0x7b1b);
  // dedup boundary: bordered l/s removed at level > 0 (fill hides left border)
  assert.equal(codepoints.bar1_ghb_l_01, undefined);
  assert.equal(codepoints.bar1_ghb_s_01, undefined);

  // multi-lane dedup: bordered l kept when any lane is 0
  assert.equal(codepoints.bar2_ghb_l_01, 0x7001);
  assert.equal(codepoints.bar2_ghb_l_10, 0x7009);
  // multi-lane dedup: bordered l removed when all lanes > 0
  assert.equal(codepoints.bar2_ghb_l_11, undefined);
  // multi-lane dedup: no-border l always removed
  assert.equal(codepoints.bar2_ghn_l_11, undefined);
  assert.equal(codepoints.bar2_ghn_l_01, undefined);
});
