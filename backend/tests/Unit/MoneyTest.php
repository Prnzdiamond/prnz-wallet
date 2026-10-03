<?php

namespace Tests\Unit;

use App\Enums\Currency;
use App\Support\Money;
use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\TestCase;

class MoneyTest extends TestCase
{
    public static function validAmounts(): array
    {
        return [
            ['1', Currency::NGN, 100],
            ['1.5', Currency::NGN, 150],
            ['1500.05', Currency::NGN, 150005],
            ['0.01', Currency::USD, 1],
            ['0.000001', Currency::USDT, 1],
            ['80000', Currency::NGN, 8000000],
            ['999999999999.99', Currency::NGN, 99999999999999],
        ];
    }

    #[Test]
    #[DataProvider('validAmounts')]
    public function it_converts_decimal_strings_to_minor_units(string $amount, Currency $currency, int $minor): void
    {
        $this->assertSame($minor, Money::toMinor($amount, $currency));
    }

    public static function invalidAmounts(): array
    {
        return [
            'too many decimals' => ['1.005', Currency::NGN],
            'negative' => ['-1', Currency::NGN],
            'leading zero' => ['01', Currency::NGN],
            'exponent' => ['1e3', Currency::NGN],
            'trailing dot' => ['1.', Currency::NGN],
            'empty' => ['', Currency::NGN],
            'spaces' => [' 1', Currency::NGN],
            'comma' => ['1,000', Currency::NGN],
            'too large' => ['1000000000000', Currency::NGN],
            'usdt seven decimals' => ['1.0000001', Currency::USDT],
        ];
    }

    #[Test]
    #[DataProvider('invalidAmounts')]
    public function it_rejects_malformed_amounts(string $amount, Currency $currency): void
    {
        $this->expectException(InvalidArgumentException::class);

        Money::toMinor($amount, $currency);
    }

    #[Test]
    public function it_formats_minor_units_at_the_currency_scale(): void
    {
        $this->assertSame('1500.05', Money::fromMinor(150005, Currency::NGN));
        $this->assertSame('0.01', Money::fromMinor(1, Currency::USD));
        $this->assertSame('0.000001', Money::fromMinor(1, Currency::USDT));
        $this->assertSame('0.00', Money::fromMinor(0, Currency::NGN));
        $this->assertSame('-25.00', Money::fromMinor(-2500, Currency::NGN));
    }
}
