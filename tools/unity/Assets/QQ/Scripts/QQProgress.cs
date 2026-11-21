// Between-battle loop (Clash of Clans / Diablo Immortal lesson: a short battle, then a visible reward and a choice of upgrade).
// Author's rules: coins buy upgrades; each battle level caps them ("the cap is just enough"); enemies grow every battle,
// so an under-upgraded Gúlayım should lose. Saved in PlayerPrefs.
using UnityEngine;

public static class QQProgress
{
    public static readonly string[] Names = { "Qilich", "Sog'liq", "Tumor" };
    public static readonly string[] Info = { "+12% zarba", "+10% jon", "-1,5 s kutish" };
    public static int Level { get { return Mathf.Max(1, PlayerPrefs.GetInt("qq_level", 1)); } set { PlayerPrefs.SetInt("qq_level", value); PlayerPrefs.Save(); } }
    public static int Chapter { get { return PlayerPrefs.GetInt("qq_chapter", 1); } set { PlayerPrefs.SetInt("qq_chapter", value); PlayerPrefs.Save(); } }
    public static int Coins { get { return PlayerPrefs.GetInt("qq_coins", 0); } set { PlayerPrefs.SetInt("qq_coins", value); PlayerPrefs.Save(); } }
    public static int Upg(int i) { return PlayerPrefs.GetInt("qq_upg" + i, 0); }
    public static int Cap { get { return Level + 1; } }                       // per-battle cap
    public static int Cost(int i) { return 40 + Upg(i) * 35; }
    public static bool CanBuy(int i) { return Upg(i) < Cap && Coins >= Cost(i); }
    public static bool Buy(int i)
    {
        if (!CanBuy(i)) return false;
        Coins -= Cost(i); PlayerPrefs.SetInt("qq_upg" + i, Upg(i) + 1); PlayerPrefs.Save(); return true;
    }
    // effects
    public static float DmgMul { get { return 1f + .12f * Upg(0); } }
    public static float HpMul { get { return 1f + .10f * Upg(1); } }
    public static float AmuletCdCut { get { return 1.5f * Upg(2); } }
    // enemy growth per battle level
    public static int ExtraFoes { get { return (Level - 1) * 2; } }
    public static float FoeHpMul { get { return 1f + .15f * (Level - 1); } }
    public static float FoeDmgMul { get { return 1f + .10f * (Level - 1); } }
    public static int Reward(int killed, int lost, int bestChain) { return 25 + killed * 2 + Mathf.Min(40, bestChain / 2) + (lost == 0 ? 20 : 0); }
}
