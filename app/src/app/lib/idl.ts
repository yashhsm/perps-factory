import type { Idl } from "@anchor-lang/core";

const rawIdl = {
  "address": "FtQtY9QpFAUFqTVK1266cm5xHkcNR5AYQhcGAdM8wzCC",
  "metadata": {
    "name": "perps_factory",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "add_liquidity",
      "discriminator": [181,157,89,67,143,182,52,72],
      "accounts": [
        {"name":"market","writable":true},
        {"name":"lp_position","writable":true,"pda":{"seeds":[{"kind":"const","value":[108,112]},{"kind":"account","path":"market"},{"kind":"account","path":"provider"}]}},
        {"name":"vault","writable":true},
        {"name":"provider_token","writable":true},
        {"name":"provider","writable":true,"signer":true},
        {"name":"token_program","address":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
        {"name":"system_program","address":"11111111111111111111111111111111"}
      ],
      "args": [{"name":"amount","type":"u64"}]
    },
    {
      "name": "close_position",
      "discriminator": [123,134,81,0,49,68,98,98],
      "accounts": [
        {"name":"market","writable":true},
        {"name":"position","writable":true,"pda":{"seeds":[{"kind":"const","value":[112,111,115,105,116,105,111,110]},{"kind":"account","path":"market"},{"kind":"account","path":"trader"}]}},
        {"name":"vault","writable":true},
        {"name":"trader_token","writable":true},
        {"name":"pyth_feed"},
        {"name":"trader","writable":true,"signer":true},
        {"name":"token_program","address":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}
      ],
      "args": []
    },
    {
      "name": "create_market",
      "discriminator": [103,226,97,235,200,188,251,254],
      "accounts": [
        {"name":"protocol","writable":true,"pda":{"seeds":[{"kind":"const","value":[112,114,111,116,111,99,111,108]}]}},
        {"name":"market","writable":true,"pda":{"seeds":[{"kind":"const","value":[109,97,114,107,101,116]},{"kind":"account","path":"protocol.market_count","account":"Protocol"}]}},
        {"name":"vault","writable":true,"pda":{"seeds":[{"kind":"const","value":[118,97,117,108,116]},{"kind":"account","path":"market"}]}},
        {"name":"pyth_feed"},
        {"name":"collateral_mint"},
        {"name":"creator","writable":true,"signer":true},
        {"name":"token_program","address":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
        {"name":"system_program","address":"11111111111111111111111111111111"}
      ],
      "args": [{"name":"params","type":{"defined":{"name":"CreateMarketParams"}}}]
    },
    {
      "name": "initialize",
      "discriminator": [175,175,109,31,13,152,155,237],
      "accounts": [
        {"name":"protocol","writable":true,"pda":{"seeds":[{"kind":"const","value":[112,114,111,116,111,99,111,108]}]}},
        {"name":"authority","writable":true,"signer":true},
        {"name":"treasury"},
        {"name":"system_program","address":"11111111111111111111111111111111"}
      ],
      "args": []
    },
    {
      "name": "liquidate",
      "discriminator": [223,179,226,125,48,46,39,74],
      "accounts": [
        {"name":"market","writable":true},
        {"name":"position","writable":true,"pda":{"seeds":[{"kind":"const","value":[112,111,115,105,116,105,111,110]},{"kind":"account","path":"market"},{"kind":"account","path":"position_owner"}]}},
        {"name":"vault","writable":true},
        {"name":"liquidator_token","writable":true},
        {"name":"pyth_feed"},
        {"name":"position_owner","writable":true},
        {"name":"liquidator","writable":true,"signer":true},
        {"name":"token_program","address":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}
      ],
      "args": []
    },
    {
      "name": "open_position",
      "discriminator": [135,128,47,77,15,152,240,49],
      "accounts": [
        {"name":"market","writable":true},
        {"name":"position","writable":true,"pda":{"seeds":[{"kind":"const","value":[112,111,115,105,116,105,111,110]},{"kind":"account","path":"market"},{"kind":"account","path":"trader"}]}},
        {"name":"vault","writable":true},
        {"name":"trader_token","writable":true},
        {"name":"pyth_feed"},
        {"name":"trader","writable":true,"signer":true},
        {"name":"token_program","address":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"},
        {"name":"system_program","address":"11111111111111111111111111111111"}
      ],
      "args": [{"name":"params","type":{"defined":{"name":"OpenPositionParams"}}}]
    },
    {
      "name": "remove_liquidity",
      "discriminator": [80,85,209,72,24,206,177,108],
      "accounts": [
        {"name":"market","writable":true},
        {"name":"lp_position","writable":true,"pda":{"seeds":[{"kind":"const","value":[108,112]},{"kind":"account","path":"market"},{"kind":"account","path":"provider"}]}},
        {"name":"vault","writable":true},
        {"name":"provider_token","writable":true},
        {"name":"provider","writable":true,"signer":true},
        {"name":"token_program","address":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}
      ],
      "args": [{"name":"lp_amount","type":"u64"}]
    },
    {
      "name": "update_funding",
      "discriminator": [224,66,9,70,75,81,94,88],
      "accounts": [
        {"name":"market","writable":true},
        {"name":"vault","writable":true},
        {"name":"cranker_token","writable":true},
        {"name":"pyth_feed"},
        {"name":"cranker","writable":true,"signer":true},
        {"name":"token_program","address":"TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"}
      ],
      "args": []
    }
  ],
  "accounts": [
    {"name":"LpPosition","discriminator":[105,241,37,200,224,2,252,90]},
    {"name":"Market","discriminator":[219,190,213,55,0,227,198,154]},
    {"name":"Position","discriminator":[170,188,143,228,122,64,247,208]},
    {"name":"Protocol","discriminator":[45,39,101,43,115,72,131,40]}
  ],
  "errors": [
    {"code":6000,"name":"MarketNotActive","msg":"Market is not active"},
    {"code":6001,"name":"ExcessiveLeverage","msg":"Leverage exceeds market maximum"},
    {"code":6002,"name":"ZeroSize","msg":"Position size must be non-zero"},
    {"code":6003,"name":"InsufficientCollateral","msg":"Insufficient collateral for position"},
    {"code":6004,"name":"NotLiquidatable","msg":"Position is not liquidatable"},
    {"code":6005,"name":"BelowMaintenanceMargin","msg":"Position margin ratio is below maintenance"},
    {"code":6006,"name":"InvalidPriceFeed","msg":"Invalid Pyth price feed"},
    {"code":6007,"name":"StalePriceData","msg":"Pyth price is stale"},
    {"code":6008,"name":"PriceConfidenceTooWide","msg":"Pyth price confidence too wide"},
    {"code":6009,"name":"FundingTooEarly","msg":"Funding rate update too early"},
    {"code":6010,"name":"InsufficientLpShares","msg":"Insufficient LP shares"},
    {"code":6011,"name":"InsufficientLiquidity","msg":"AMM pool has insufficient liquidity"},
    {"code":6012,"name":"MathOverflow","msg":"Arithmetic overflow"},
    {"code":6013,"name":"InvalidParams","msg":"Invalid market parameters"}
  ],
  "types": [
    {"name":"CreateMarketParams","type":{"kind":"struct","fields":[{"name":"max_leverage","type":"u8"},{"name":"trading_fee_bps","type":"u16"},{"name":"maintenance_margin_bps","type":"u16"},{"name":"initial_amm_base","type":"u64"},{"name":"initial_amm_quote","type":"u64"}]}},
    {"name":"LpPosition","type":{"kind":"struct","fields":[{"name":"owner","type":"pubkey"},{"name":"market","type":"pubkey"},{"name":"lp_shares","type":"u64"},{"name":"deposited_amount","type":"u64"},{"name":"bump","type":"u8"}]}},
    {"name":"Market","type":{"kind":"struct","fields":[{"name":"index","type":"u64"},{"name":"pyth_feed","type":"pubkey"},{"name":"collateral_mint","type":"pubkey"},{"name":"vault","type":"pubkey"},{"name":"amm_base","type":"u64"},{"name":"amm_quote","type":"u64"},{"name":"lp_shares_total","type":"u64"},{"name":"cumulative_funding_long","type":"i128"},{"name":"cumulative_funding_short","type":"i128"},{"name":"last_funding_ts","type":"i64"},{"name":"mark_twap_acc","type":"i128"},{"name":"index_twap_acc","type":"i128"},{"name":"twap_last_ts","type":"i64"},{"name":"max_leverage","type":"u8"},{"name":"trading_fee_bps","type":"u16"},{"name":"maintenance_margin_bps","type":"u16"},{"name":"liquidation_fee_bps","type":"u16"},{"name":"open_interest_long","type":"u64"},{"name":"open_interest_short","type":"u64"},{"name":"creator","type":"pubkey"},{"name":"active","type":"bool"},{"name":"bump","type":"u8"}]}},
    {"name":"OpenPositionParams","type":{"kind":"struct","fields":[{"name":"side","type":{"defined":{"name":"Side"}}},{"name":"size","type":"u64"},{"name":"collateral","type":"u64"}]}},
    {"name":"Position","type":{"kind":"struct","fields":[{"name":"owner","type":"pubkey"},{"name":"market","type":"pubkey"},{"name":"size","type":"i64"},{"name":"collateral","type":"u64"},{"name":"entry_price","type":"u64"},{"name":"entry_funding","type":"i128"},{"name":"opened_at","type":"i64"},{"name":"bump","type":"u8"}]}},
    {"name":"Protocol","type":{"kind":"struct","fields":[{"name":"authority","type":"pubkey"},{"name":"market_count","type":"u64"},{"name":"protocol_fee_bps","type":"u16"},{"name":"treasury","type":"pubkey"},{"name":"bump","type":"u8"}]}},
    {"name":"Side","type":{"kind":"enum","variants":[{"name":"Long"},{"name":"Short"}]}}
  ],
  "constants": [
    {"name":"LP_SEED","type":"bytes","value":"[108, 112]"},
    {"name":"MARKET_SEED","type":"bytes","value":"[109, 97, 114, 107, 101, 116]"},
    {"name":"POSITION_SEED","type":"bytes","value":"[112, 111, 115, 105, 116, 105, 111, 110]"},
    {"name":"PROTOCOL_SEED","type":"bytes","value":"[112, 114, 111, 116, 111, 99, 111, 108]"},
    {"name":"VAULT_SEED","type":"bytes","value":"[118, 97, 117, 108, 116]"}
  ]
} as const;

export type PerpsFactoryIdl = typeof rawIdl & Idl;

const idl = rawIdl as PerpsFactoryIdl;

export default idl;
export const PROGRAM_ID = idl.address;
