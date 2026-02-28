const test = require("node:test");
const assert = require("node:assert/strict");

test("font generator codepoints include expected chart glyph entries", () => {
  const config = require("../scripts/font/fantasticon.config.js");
  const codepoints = config.codepoints;

  assert.equal(typeof codepoints, "object");
  assert.equal(Object.keys(codepoints).length, 26728);
  assert.equal(codepoints.bar2_gfn_m_80, 0x76ed);
  assert.equal(codepoints.bar2_ghn_m_80, 0x75a9);
  assert.equal(codepoints.bar3_ghb_l_000, 0x1000);
  assert.equal(codepoints.bar1_nfn_s_16, 0x7d1f);
  assert.equal(codepoints.donut2_fn_r_32, 0x7f27);
});
