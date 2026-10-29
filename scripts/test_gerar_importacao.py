import unittest
from decimal import Decimal

from gerar_importacao import build_sql, import_date, norm, parse_price, wm_price


class PriceParsingTests(unittest.TestCase):
    def test_plus_is_part_of_the_model(self):
        self.assertNotEqual(norm('iPhone XS+'), norm('iPhone XS'))
        self.assertEqual(norm('iPhone XS+'), norm('iPhone XS Plus'))

    def test_valid_prices(self):
        for value, expected in [("R$ 45,00", "45"), ("45.90", "45.90"),
                                ("1.349,90", "1349.90"), ("1.349", "1349"),
                                (0, "0"), (45.9, "45.90")]:
            with self.subTest(value=value):
                self.assertEqual(parse_price(value), Decimal(expected))

    def test_invalid_prices_are_not_converted(self):
        for value in ["-45,00", "1a2", "12.34.56", "1,2,3", "1 2", "NaN",
                      float("inf"), float("nan"), True, -1, "12,345"]:
            with self.subTest(value=value):
                self.assertIsNone(parse_price(value))
                self.assertIsNone(wm_price(value))

    def test_world_mobile_preserves_decimal_separator(self):
        self.assertEqual(wm_price("45.90"), 45.9)
        self.assertIsNone(wm_price(0))

    def test_invalid_dates_cannot_enter_sql(self):
        for value in ["2026-02-30", "2026-1-01", "2026-10-01'; rollback; --"]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                import_date(value)

    def test_build_validates_prices_and_per_row_dates(self):
        row = {"name": "Tela teste", "supplier": "A", "price": -50, "brand": None,
               "tech": None, "quality": None}
        with self.assertRaises(ValueError):
            build_sql([row], "2026-10-01", ["A"])
        row.update(price=50, date="2026-02-30")
        with self.assertRaises(ValueError):
            build_sql([row], "2026-10-01", ["A"])

    def test_duplicate_prices_keep_minimum_and_conflicts_can_be_excluded(self):
        base = {"name": "Tela teste", "supplier": "A", "brand": None, "tech": None, "quality": None}
        rows = [dict(base, price=100), dict(base, price=80)]
        _, final, _ = build_sql(rows, "2026-10-01", ["A"])
        self.assertEqual(final[0]["price"], Decimal("80"))
        _, final, conflicts = build_sql(rows, "2026-10-01", ["A"], conflict="exclude")
        self.assertEqual(final, [])
        self.assertEqual(len(conflicts), 1)


if __name__ == "__main__":
    unittest.main()
