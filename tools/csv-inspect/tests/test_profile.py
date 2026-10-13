import unittest
from profiler.report import profile
from profiler.types import infer_type
from profiler.frequency import most_common


class ProfileTests(unittest.TestCase):
    def test_missing_and_frequency(self):
        output = profile(["city"], [{"city": "NY"}, {"city": ""}, {"city": "NY"}])
        self.assertEqual(output["columns"][0]["missing"], 1)
        self.assertEqual(output["columns"][0]["top_values"][0]["count"], 2)

    def test_type(self):
        self.assertEqual(infer_type(["1", "2.5"]), "number")
        self.assertEqual(infer_type(["2026-01-02"]), "datetime")

    def test_negative_limit(self):
        with self.assertRaises(ValueError):
            most_common(["x"], -1)


if __name__ == "__main__":
    unittest.main()
